//#region variables
import { utils, directives, logging } from "../node_modules/davinci.js/dist/daVinci";
import * as template from "text!./q2g-ext-altStateDirective.html";
import "css!./q2g-ext-altStateDirective.css";
//#endregion

//#region interfaces

interface IDataModelItemObject extends directives.IDataModelItem {
    /**
     * name of the state
     */
    state: string;
    /**
     * path of the state, required for the patch function from engine
     */
    path?: string;
    /**
     * name of the patch operateion (Add, Remove, Reset)
     */
    patchOperation?: EngineAPI.NxPatchOpType;
}
//#endregion

//#region global definitions

const excludedObjects: Array<string> = [
    "masterobject",
    "sheet",
    "slider",
    "slideritem",
    "embeddedsnapshot",
    "dimension",
    "measure",
    "snapshot",
    "slideitem",
    "slide",
    "LoadModel",
    "story",
    "bookmark",
    "q2g-ext-alternatestates"
];

enum eStateName {
    addAltState,
    searchAltState
}
//#endregion

//#region assist classes

/**
 * object with information of the qlik client objects
 */
class QlikCollectionObject implements IDataModelItemObject {

    //#region variables
    fieldDef: string;
    hasFocus: boolean = false;
    id: string;
    patchOperation: EngineAPI.NxPatchOpType;
    path: string;
    qElementNumber: number;
    state: string = "$";
    status: string = "O";
    title: string;
    object: EngineAPI.IGenericObject;
    type: string;
    sortIndex: string;
    //#endregion

    //#region logger
    private _logger: logging.Logger;
    private get logger(): logging.Logger {
        if (!this._logger) {
            try {
                this._logger = new logging.Logger("QlikCollectionObject");
            } catch (e) {
                this.logger.error("ERROR in create logger instance", e);
            }
        }
        return this._logger;
    }
    //#endregion

    /**
     * processing th qlik object for the rendering and the functionality required
     * @param object qlik session object for the array
     */
    constructor(object: EngineAPI.IGenericObject) {
        this.object = object;
        object.getProperties()
            .then((properties) => {
                this.id = properties.qInfo.qId;
                this.status = "O";

                if (properties.qHyperCubeDef) {
                    this.path = "/qHyperCubeDef/qStateName";
                    if (properties.qHyperCubeDef.qStateName) {
                        if (properties.qHyperCubeDef.qStateName) {
                            this.state = properties.qHyperCubeDef.qStateName;
                        }
                        this.patchOperation = (properties.qHyperCubeDef.qStateName !== "$")? "Replace": "Add";
                    }
                } else if (properties.qListObjectDef) {
                    this.path = "/qListObjectDef/qStateName";
                    if (properties.qListObjectDef.qStateName) {
                        this.state = properties.qListObjectDef.qStateName;
                    }
                    this.patchOperation = (properties.qListObjectDef.qStateName !== "$")? "Replace": "Add";
                }


                if (typeof properties.title === "string") {
                        this.type = properties.qInfo.qType;
                        this.title = ((properties.title.length === 0)? "no title": properties.title)
                            + " (" + properties.qInfo.qType+"-"+properties.qInfo.qId+"-"+this.state + ")";

                } else if (typeof properties.title === "object") {
                    object.app.evaluateEx(properties.title.qStringExpression.qExpr)
                        .then((res) => {
                            this.type = properties.qInfo.qType;
                            this.title = res.qText + " (" + properties.qInfo.qType+"-"+properties.qInfo.qId+"-"+this.state + ")";
                        })
                        .catch((error) => {
                            this.logger.error("error while eval exresison", error);
                        });
                }
            })
            .catch((error) => {
                this.logger.error("Error in constructor of QlikCollectionObject", Error);
            });
    }

    /**
     * change the state of an object
     * @param stateName name of the alternate state to be set
     */
    public setState(stateName: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let patchObject: EngineAPI.INxPatch = {
                qOp: this.patchOperation,
                qPath: this.path,
                qValue: "\""+stateName+"\""
            };
            this.object.applyPatches([patchObject])
                .then(() => {
                    resolve(true);
                })
                .catch((error) => {
                    this.logger.error("error in setState of QlikCollectionObject class: ", error);
                    reject(error);
                });
        });
    }
}

/**
 * Array Adapter to controll the functionality of the collections to be displayed
 */
class AssistArrayAdapter<T extends directives.IDataModelItem> {

    //#region variables
    itemsCount: number;
    preCalcCollection: Array<T> = [];
    //#endregion

    //#region itemsPageSize
    private _itemsPageSize: number;
    public get itemsPageSize(): number {
        return this._itemsPageSize;
    }
    public set itemsPageSize(v: number) {
        if (this._itemsPageSize !== v) {
            this._itemsPageSize = v;
            this.calcDataPages(this.itemsPageTop, v)
                .then((res: Array<T>) => {
                    this._calcCollection = res;
                })
                .catch((error) => {
                    this.logger.error(error);
                });
        }
    }
    //#endregion

    //#region itemsPageTop
    private _itemsPageTop: number = 0;
    public get itemsPageTop(): number {
        return this._itemsPageTop;
    }
    public set itemsPageTop(v : number) {
        if (this._itemsPageTop !== v) {
            this._itemsPageTop = v;
            this.calcDataPages(v, this.itemsPageSize)
                .then((res: Array<T>) => {
                    this._calcCollection = res;
                })
                .catch((error) => {
                    this.logger.error(error);
                });
        }
    }
    //#endregion

    //#region logger
    protected _logger: logging.Logger;
    protected get logger(): logging.Logger {
        if (!this._logger) {
            try {
                this._logger = new logging.Logger("AssistArrayAdapter");
            } catch (e) {
                this.logger.error("ERROR in create logger instance", e);
            }
        }
        return this._logger;
    }
    //#endregion

    //#region collection
    protected _collection: Array<T> = [];
    public get collection() : Array<T> {
        return this._collection;
    }
    public set collection(v : Array<T>) {
        if (v !== this._collection) {
            this._collection = v;
        }
    }
    //#endregion

    //#region calcCollection
    protected _calcCollection: Array<T> = [];
    public get calcCollection() : Array<T> {
        return this._calcCollection;
    }
    //#endregion

    /**
     * allocation of variables
     */
    constructor() {
        //
    }

    /**
     * replaces some character
     * @param qMatch string to be checked
     */
    private replace(qMatch: string): string {
        return qMatch
        .replace(/[\-\[\]\/\{\}\(\)\+\?\.\\\^\$\|]/g, "\\$&")
        .replace(/\*/g, ".*");
    }

    /**
     * sorts an array by title
     * @param collection collectiont to be sorted
     */
    protected sort(collection: Array<T>) {
        return collection.sort((a, b) => {
            if(a.title < b.title) {
                return -1;
            }
            if(a.title > b.title) {
                return 1;
            }
            return 0;
        });
    }

    /**
     * calculates the dataPage to be displayed
     * @param pageTop first Position of the data page
     * @param pageSize size of the data page
     */
    protected calcDataPages(pageTop: number, pageSize: number): Promise<Array<T>> {
        return new Promise((resolve, reject) => {
            try {
                resolve(this.preCalcCollection.slice(pageTop, pageTop + pageSize));
            } catch (error) {
                this.logger.error("Error in getListObjectData", error);
                reject(error);
            }
        });
    }

    /**
     * updates the existing collection
     * @param elements the new Array which should include in the update of the old collection
     */
    updateCollection(elements: T[]): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.itemsCount = elements.length;
                let localCollection = this.collection;
                let arrToBeDeleated: Array<string> = [];


                for (const item of localCollection) {
                    arrToBeDeleated.push(item.id);
                }

                for(let element of elements) {
                    let indexDelete: number = arrToBeDeleated.indexOf(element.id);
                    arrToBeDeleated.splice(indexDelete, 1);

                    let newElement = true;

                    for (let x of this.collection) {
                        if (x.id === element.id) {
                            newElement = false;
                            if (x.status !== element.status) {
                                x = element;
                            }
                        }
                    }
                    if (newElement) {
                        localCollection.push(element);
                    }
                }
                for (const item of arrToBeDeleated) {
                    let counter: number = -1;
                    for (const element of localCollection) {
                        counter++;
                        if (element.id === item) {
                            localCollection.splice(counter, 1);
                            counter--;
                        }
                    }
                }

                localCollection = this.sort(localCollection);
                this._collection = localCollection;
                this.preCalcCollection = localCollection;
                this.calcDataPages(this.itemsPageTop, this.itemsPageSize)
                    .then((res) => {
                        this._calcCollection = res;
                    })
                    .catch((error) => {
                        this.logger.error("error in updateCollection", error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * getObjectById returns an object
     * @param id id of the object to be returned
     */
    getObjectById(id: string): Promise<T> {
        return new Promise((resolve, reject) => {
            try {
                resolve(this.collection.filter((x) => {
                    if (x.id === id) {
                        return x;
                    }
                })[0]);
            } catch (error) {
                this.logger.error("error in getObjectById", error);
                reject(error);
            }
        });
    }

    /**
     * search the list object for the inserted string
     * @param qMatch search string to be looked for
     * @returns a Promise if the search was succesfull
     */
    searchListObjectFor(qMatch: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            try {
                this.preCalcCollection = this.collection.filter((element) => {
                    if (element.title.match(new RegExp(this.replace(qMatch), "i"))) {
                        return element;
                    }
                });
                this.calcDataPages(this.itemsPageTop, this.itemsPageSize)
                    .then((res) => {
                        this._calcCollection = res;
                        resolve(true);
                    })
                    .catch((error) => {
                        this.logger.error("ERROR", error);
                        reject(error);
                    });
            } catch (error) {
                this.logger.error("ERROR", error);
                reject(error);
            }
        });
    }
}

/**
 * controll the functionality of the collections to be displayed from qlik objects
 */
class QlikCollection extends AssistArrayAdapter<QlikCollectionObject> {

    //#region prefix
    private _prefix: string;
    public get prefix() : string {
        return this._prefix;
    }
    public set prefix(v : string) {
        if (v !== this._prefix) {
            this._prefix = v;
            this.collection = this.sort(this.collection);
            this.calcDataPages(this.itemsPageTop, this.itemsPageSize)
                .then((res) => {
                    this._calcCollection = res;
                })
                .catch((error) => {
                    this.logger.error("error in updateCollection", error);
                });
        }
    }
    //#endregion

    /**
     * allocation of variables
     */
    constructor() {
        super();
    }

    /**
     * set sortIndex and sorts an array by sortId
     * @param collection collectiont to be sorted
     */
    sort(collection: Array<QlikCollectionObject>) {

        for (const item of collection) {
            switch (item.state) {
                case this.prefix:
                    item.status = "S";
                    item.sortIndex = "0" + item.title;
                    break;

                case "$":
                    item.status = "O";
                    item.sortIndex = "1" + item.title;
                    break;

                default:
                    item.status = "A";
                    item.sortIndex = item.state + item.title;
            }
        }

        return collection.sort((a, b) => {
            if(a.sortIndex < b.sortIndex) {
                return -1;
            }
            if(a.sortIndex > b.sortIndex) {
                return 1;
            }
            return 0;
        });
    }

    /**
     * updates the existing collection
     * @param elements the new Array which should include in the update of the old collection
     */
    updateCollection(elements: QlikCollectionObject[]): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.itemsCount = elements.length;
                let localCollection = this.collection;
                let arrToBeDeleated: Array<string> = [];

                for (const item of this.collection) {
                    arrToBeDeleated.push(item.id);
                }

                for(let element of elements) {
                    let indexDeleat: number = arrToBeDeleated.indexOf(element.id);
                    arrToBeDeleated.splice(indexDeleat, 1);
                    let newElement = true;
                    let counter: number = -1;
                    for (let x of localCollection) {
                        counter++;
                        if (x.id === element.id) {
                            newElement = false;
                            if (x.state !== element.state) {
                                localCollection[counter] = element;
                            }
                        }
                    }
                    if (newElement) {
                        localCollection.push(element);
                    }
                }

                for (const item of arrToBeDeleated) {
                    let counter: number = -1;
                    for (const element of localCollection) {
                        counter++;
                        if (element.id === item) {
                            localCollection.splice(counter, 1);
                            counter--;
                        }
                    }
                }

                localCollection = this.sort(localCollection);
                this._collection = localCollection;
                this.preCalcCollection = localCollection;
                this.calcDataPages(this.itemsPageTop, this.itemsPageSize)
                    .then((res) => {
                        this._calcCollection = res;
                        resolve();
                    })
                    .catch((error) => {
                        this.logger.error("error in updateCollection", error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    }
}

//#endregion

class AltStateController {

    //#region variables
    app: EngineAPI.IApp;
    scope: ng.IScope;
    timeout: ng.ITimeoutService;
    altStateObject: AssistArrayAdapter<directives.IDataModelItem>;
    qlikObject: QlikCollection;
    addState: string;
    element: JQuery;
    theme: string;
    editMode: boolean = false;
    menuList: Array<utils.IMenuElement>;
    menuListObjects: Array<utils.IMenuElement>;
    showSearchFieldState = true;
    showButtons = false;
    showButtonsObjects = false;
    titleAltState: string = "Alternate State";
    inputStates = new utils.StateMachineInput<eStateName>();
    showInputField: boolean = false;
    inputBarFocus: boolean = false;
    focusedPositionAltState: number;
    showFocusedAltState: boolean = true;
    showFocusedObject: boolean = true;
    selectedObjects: Array<string> = [];
    selectedRootObjects: Array<string> = [];
    showInputFieldObjects: boolean = false;
    inputBarFocusObjects: boolean = false;
    //#endregion

    //#region selectedAltState
    private _selectedAltState: string;
    public get selectedAltState() : string {
        return this._selectedAltState;
    }
    public set selectedAltState(v : string) {
        if (this._selectedAltState !== v) {
            this._selectedAltState = v;
            this.menuList[2].isEnabled = false;
            this.menuList = JSON.parse(JSON.stringify(this.menuList));
        }
    }
    //#endregion

    //#region model
    private _model: EngineAPI.IGenericObject;
    public get model(): EngineAPI.IGenericObject {
        return this._model;
    }
    public set model(v: EngineAPI.IGenericObject) {
        if (v !== this._model) {
            this._model = v;
            let that = this;
            this.app = v.app;
            this.app.on("changed", function () {
                this.app.getAppLayout()
                    .then((appLayout: EngineAPI.INxAppLayout) => {
                        let collection: Array<directives.IDataModelItem> = [];
                        for (const iterator of appLayout.qStateNames) {
                            collection.push({
                                fieldDef: "",
                                hasFocus: false,
                                id: iterator,
                                qElementNumber: -1,
                                status: "A",
                                title: iterator
                            });
                        }
                        return that.altStateObject.updateCollection(collection);
                        // scope.$digest();
                    })
                    .then(() => {
                        that.scope.$digest();
                    })
                    .catch((error) => {
                        console.error("ERROR in get Layout ", error);
                    });
                this.app.getAllInfos()
                    .then((appInfo: EngineAPI.INxInfo[]) => {
                        let objects: Array<Promise<void | EngineAPI.IGenericObjectProperties>> = [];
                        let collection: Array<QlikCollectionObject> = [];
                        for (const iterator of appInfo) {
                            if (excludedObjects.indexOf(iterator.qType)===-1) {
                                objects.push(this.app.getObject(iterator.qId)
                                    .then((res: EngineAPI.IGenericObject) => {
                                        collection.push(new QlikCollectionObject(res));
                                        return res.getProperties();
                                    })
                                    .catch((error) => {
                                        console.error("ERROR",error);
                                    }));
                            }
                        }
                        Promise.all(objects)
                            .then((res) => {
                                return that.qlikObject.updateCollection(collection);
                            })
                            .then(() => {
                                that.timeout();
                            })
                            .catch((error) => {
                                console.error("ERROR IN CATCH",error);
                            });
                    })
                    .catch((error) => {
                        this.logger.error(error);
                    });
            });
            this.app.emit("changed");
        }
    }
    //#endregion

    //#region elementHeight
    private _elementHeight: number = 0;
    get elementHeight(): number {
        return this._elementHeight;
    }
    set elementHeight(value: number) {
        if (this.elementHeight !== value) {
            try {
                this._elementHeight = value;

                // if (this.altStateObject) {
                //     this.altStateObject.emit("changed", utils.calcNumbreOfVisRows(this.elementHeight));
                // }
            } catch (err) {
                this.logger.error("error in setter of elementHeight", err);
            }
        }
    }
    //#endregion

    //#region logger
    private _logger: logging.Logger;
    private get logger(): logging.Logger {
        if (!this._logger) {
            try {
                this._logger = new logging.Logger("AltStateController");
            } catch (e) {
                this.logger.error("ERROR in create logger instance", e);
            }
        }
        return this._logger;
    }
    //#endregion

    //#region headerInput
    private _headerInput: string;
    public get headerInput() : string {
        return this._headerInput;
    }
    public set headerInput(v : string) {
        if (this._headerInput !== v) {
            this._headerInput = v;
            try {
                if (!(this.inputStates.relStateName === eStateName.addAltState)) {
                    this.altStateObject.searchListObjectFor(!v? "": v)
                    .then(() => {
                        this.altStateObject.itemsCount = this.altStateObject.preCalcCollection.length;
                        this.timeout();
                    })
                    .catch((error) => {
                        this.logger.error("error", error);
                    });
                } else {
                    if(this.menuList[0].isEnabled) {
                        this.menuList[0].isEnabled = false;
                        this.menuList = JSON.parse(JSON.stringify(this.menuList));
                    }
                }
            } catch (error) {
                this.logger.error("error in setter of headerInput", error);
            }
        }
    }
    //#endregion

    //#region headerInputObjects
    private _headerInputObjects: string;
    public get headerInputObjects() : string {
        return this._headerInputObjects;
    }
    public set headerInputObjects(v : string) {
        if (this._headerInputObjects !== v) {
            this._headerInputObjects = v;
            try {
                this.qlikObject.searchListObjectFor(!v? "": v)
                .then(() => {
                    this.qlikObject.itemsCount = this.qlikObject.preCalcCollection.length;
                    this.timeout();
                })
                .catch((error) => {
                    this.logger.error("error", error);
                });
            } catch (error) {
                this.logger.error("error in setter of headerInput", error);
            }
        }
    }
    //#endregion

    static $inject = ["$timeout", "$element", "$scope"];

    constructor(timeout: ng.ITimeoutService, element: JQuery, scope: ng.IScope) {
        this.element = element;
        this.timeout = timeout;
        this.scope = scope;
        this.altStateObject  = new AssistArrayAdapter();
        this.qlikObject = new QlikCollection();
        this.initMenuElements();
        this.initMenuElementsObjecs();
        this.initInputStates();

        $(document).on("click", (e: JQueryEventObject) => {
            try {
                if (element.find(e.target).length === 0) {
                    this.showInputField = false;
                    this.showInputFieldObjects = false;
                    this.showButtons = false;
                    this.showButtonsObjects = false;
                    this.headerInput = null;
                    this.headerInputObjects = null;
                    this.timeout();
                }
            } catch (e) {
                this.logger.error("Error in Constructor with click event", e);
            }
        });

        scope.$watch(() => {
            return this.element.height();
        }, () => {
            this.elementHeight = this.element.height();
        });
    }

    /**
     * fills the Menu with Elements
     */
    private initMenuElements(): void {
        this.menuList = [];
        this.menuList.push({
            buttonType: "success",
            isVisible: true,
            isEnabled: true,
            icon: "tick",
            name: "Confirm Selection",
            hasSeparator: true,
            type: "menu"
        });
        this.menuList.push({
            buttonType: "",
            isVisible: true,
            isEnabled: false,
            icon: "plus",
            name: "Add Alternate State",
            hasSeparator: false,
            type: "menu"
        });
        this.menuList.push({
            buttonType: "",
            isVisible: true,
            isEnabled: true,
            icon: "minus",
            name: "Remove Alternate State",
            hasSeparator: false,
            type: "menu"
        });
    }

    /**
     * fills the Menu with Elements
     */
    private initMenuElementsObjecs(): void {
        this.menuListObjects = [];
        this.menuListObjects.push({
            buttonType: "success",
            isVisible: true,
            isEnabled: true,
            icon: "tick",
            name: "Apply State",
            hasSeparator: false,
            type: "menu"
        });
    }

    /**
     * applys the selected state to the selected objects
     */
    private applyState() {
        for (const item of this.selectedObjects) {
            this.model.app.getObject(item)
                .then((res) => {
                    return this.qlikObject.getObjectById(item);
                })
                .then((object) => {
                    return object.setState(this.selectedAltState);
                })
                .then((object) => {
                    this.app.emit("changed");
                })
                .catch((error) => {
                    this.logger.error("error in applyStates", error);
                });
        }

        for (const item of this.selectedRootObjects) {
            this.model.app.getObject(item)
                .then((res) => {
                    return this.qlikObject.getObjectById(item);
                })
                .then((object) => {
                    return object.setState("$");
                })
                .then((object) => {
                    this.app.emit("changed");
                })
                .catch((error) => {
                    this.logger.error("error in applyStates", error);
                });
        }
    }

    /**
     * adds a alternate state to the app
     */
    private addAltState() {
        this.model.app.addAlternateState(this.headerInput);
        this.headerInput = "";
        this.showInputField = false;
    }

    /**
     * removes a slternate state from the app
     */
    private removeAltState() {
        if (this.selectedAltState) {
            this.model.app.removeAlternateState(this.selectedAltState);
        }
    }

    /**
     * link actions to the buttens in the header directive
     */
    private applyButtonAction() {
        if(this.inputStates.relStateName === eStateName.addAltState) {
            this.addAltState();
        }
    }

    /**
     * controlling the options set to create a bookmark in the header input
     */
    private controllingInputBarOptions(type:eStateName): void {

        switch (type) {
            case eStateName.addAltState:
                this.inputStates.relStateName = eStateName.addAltState;
                break;

            case eStateName.searchAltState:
                this.inputStates.relStateName = eStateName.searchAltState;
                break;
        }

        this.inputBarFocus = true;
        this.headerInput = "";
        this.showButtons = true;
        this.showInputField = true;
        this.timeout();
    }

    /**
     * initialisation of the stats from the input Bar
     */
    private initInputStates(): void {
        let addAltStateState: utils.IStateMachineState<eStateName> = {
            name: eStateName.addAltState,
            icon: "lui-icon--bookmark",
            placeholder: "enter Alt State Name",
            acceptFunction : this.addAltState
        };

        this.inputStates.addState(addAltStateState);

        this.inputStates.relStateName = null;
    }

    /**
     * checks if the extension is used in Edit mode
     */
    isEditMode(): boolean {
        if (this.editMode) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * links functions to menu list
     * @param input element returns from the extension header
     */
    menuListActionCallback(input: string): void {
        switch (input) {
            case "Remove Alternate State":
                this.removeAltState();
                break;

            case "Add Alternate State":
                this.controllingInputBarOptions(eStateName.addAltState);
                this.timeout();
                break;

            case "Confirm Selection":
                this.applyButtonAction();
        }
    }

    /**
     * links functions to menu list
     * @param input element returns from the extension header
     */
    menuListObjecsActionCallback(input: string): void {
        switch (input) {
            case "Apply State":
                this.applyState();
                this.selectedObjects = [];
                this.selectedRootObjects = [];
                this.timeout();
                break;
        }
    }

    /**
     * callback when enter on input field
     */
    extensionHeaderAccept() {
        switch (this.inputStates.relStateName) {
            case eStateName.addAltState:
            this.addAltState();
                break;
        }
    }

    /**
     * selectAltStateObjectCallback
     */
    selectAltStateObjectCallback(pos: number) {
        this.selectedAltState = this.altStateObject.collection[pos].title;
        for (const item of this.altStateObject.collection) {
            item.status = "A";
        }
        this.altStateObject.collection[pos].status = "S";
        this.qlikObject.prefix = this.selectedAltState;
        this.selectedObjects = [];
        this.selectedRootObjects = [];
        this.qlikObject.itemsPageTop = 0;
        this.qlikObject.searchListObjectFor(!this.headerInputObjects? "": this.headerInputObjects)
            .then(() => {
                this.qlikObject.itemsCount = this.qlikObject.preCalcCollection.length;
                this.timeout();
            })
            .catch((error) => {
                this.logger.error("error", error);
            });
    }

    /**
     * selectObjectCallback
     */
    selectObjectCallback(pos: number) {
        if (typeof(this.selectedAltState) === "undefined" || this.selectedAltState === "") {
            return;
        }
        let selectedObject: QlikCollectionObject = this.qlikObject.calcCollection[pos];
        let indexNewState: number = this.selectedObjects.indexOf(selectedObject.id);
        let indexRootState: number = this.selectedRootObjects.indexOf(selectedObject.id);


        if (indexRootState>-1) {
            this.selectedRootObjects.splice(indexRootState,1);
            selectedObject.status = "S";

        } else if (selectedObject.status === "S" && selectedObject.state !== "$") {
                selectedObject.status = "O";
                this.selectedRootObjects.push(selectedObject.id);

        } else if (indexNewState>-1) {
            this.selectedObjects.splice(indexNewState,1);
            selectedObject.status = "O";
        } else {
            this.selectedObjects.push(selectedObject.id);
            selectedObject.status = "S";
        }

        this.showButtonsObjects = true;

        if (this.selectedObjects.length > 0 || this.selectedRootObjects.length > 0) {
            this.menuListObjects[0].isEnabled = false;
        } else {
            this.menuListObjects[0].isEnabled = true;
        }
        this.menuListObjects = JSON.parse(JSON.stringify(this.menuListObjects));
    }
}

export function AltStateDirectiveFactory(rootNameSpace: string): ng.IDirectiveFactory {
    return($document: ng.IAugmentedJQuery, $injector: ng.auto.IInjectorService, $registrationProvider: any) => {
        return {
            restrict: "E",
            replace: true,
            template: utils.templateReplacer(template, rootNameSpace),
            controller: AltStateController,
            controllerAs: "vm",
            scope: {},
            bindToController: {
                model: "<",
                theme: "<?",
                editMode: "<?"
            },
            compile: (): void => {
                utils.checkDirectiveIsRegistrated($injector, $registrationProvider, rootNameSpace,
                    directives.ListViewDirectiveFactory(rootNameSpace), "Listview");
                utils.checkDirectiveIsRegistrated($injector, $registrationProvider, rootNameSpace,
                    directives.ExtensionHeaderDirectiveFactory(rootNameSpace), "ExtensionHeader");
            }
        };
    };
}
//#region variables
import { utils, directives, logging } from "../node_modules/davinci.js/dist/daVinci";
import * as template from "text!./q2g-ext-altStateDirective.html";
import "css!./q2g-ext-altStateDirective.css";
//#endregion

interface IDataModelItemObject extends directives.IDataModelItem {
    state: string;
    path?: string;
    patchOperation?: EngineAPI.NxPatchOpType;

}

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

                        this.title = ((properties.title.length === 0)? "no title": properties.title)
                            + "-" + properties.qInfo.qType+"-"+properties.qInfo.qId+"-"+this.state;

                } else if (typeof properties.title === "object") {
                    object.app.evaluateEx(properties.title.qStringExpression.qExpr)
                        .then((res) => {
                            this.title = res + "-" + properties.qInfo.qType+"-"+properties.qInfo.qId+"-"+this.state;
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

    public setState(stateName: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let patchObject: EngineAPI.INxPatch = {
                qOp: this.patchOperation,
                qPath: this.path,
                qValue: "\""+stateName+"\""
            };
            this.object.applyPatches([patchObject]);
        });
    }
}

class AssistArrayAdapter<T extends directives.IDataModelItem> {

    preClacCollection: Array<T> = [];
    collection: Array<T>;
    itemsCount: number;

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
                    this.collection = res;
                })
                .catch((error) => {
                    this.logger.error(error);
                });
        }
    }
    //#endregion

    //#region itemsPageTop
    private _itemsPageTop: number;
    public get itemsPageTop(): number {
        return this._itemsPageTop;
    }
    public set itemsPageTop(v : number) {
        if (this._itemsPageTop !== v) {
            this._itemsPageTop = v;
            this.calcDataPages(v, this.itemsPageSize)
                .then((res: Array<T>) => {
                    this.collection = res;
                })
                .catch((error) => {
                    this.logger.error(error);
                });
        }
    }
    //#endregion

    //#region logger
    private _logger: logging.Logger;
    private get logger(): logging.Logger {
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

    constructor(arr: Array<T>) {
        this.preClacCollection = arr;
        this.itemsCount = arr.length;
        this.itemsPageTop = 0;
        this.calcDataPages(this.itemsPageTop, this.itemsPageSize);
    }

    private calcDataPages(pageTop: number, pageSize: number): Promise<Array<T>> {
        return new Promise((resolve, reject) => {
            try {
                resolve(this.preClacCollection.slice(pageTop, pageTop + pageSize));
            } catch (error) {
                this.logger.error("Error in getListObjectData", error);
                reject(error);
            }
        });
    }

    /**
     * getObjectById
     */
    public getObjectById(id: string): Promise<T> {
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
}

class QlikCollection extends AssistArrayAdapter<QlikCollectionObject> {

    constructor(arr: Array<QlikCollectionObject>) {
        super(arr);
        // this.sort();
    }

    // sort() {
    //     this.collection.sort((a, b) => {
    //         if (a.state < b.state) {
    //             return -1;
    //         }
    //         if (a.state > b.state) {
    //             return 1;
    //         }
    //         return 0;
    //     });
    // }
}

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
    "sdf",
    "q2g-ext-pic-barchart",
    "templateRoot",
    "q2g-ext-altState"
];

enum eStateName {
    addAltState,
    searchAltState
}

class AltStateController {

    //#region variables
    altStateObject: AssistArrayAdapter<directives.IDataModelItem>;
    qlikObject: QlikCollection;
    addState: string;
    element: JQuery;
    timeout: ng.ITimeoutService;
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
    showFocusedAltState: boolean = false;
    selectedObjects: Array<string> = [];
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
            let app = v.app;
            app.on("changed", function () {
                app.getLayout()
                    .then((appLayout: EngineAPI.INxAppLayout) => {
                        let collection: Array<directives.IDataModelItem> = [];
                        collection.push({
                            fieldDef: "",
                            hasFocus: false,
                            id: "0000",
                            qElementNumber: -1,
                            status: "S",
                            title: "$"
                        });
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
                        that.altStateObject = new AssistArrayAdapter(collection);
                    })
                    .catch((error) => {
                        this.logger.error("ERROR in get Layout ", error);
                    });
                app.getAllInfos()
                    .then((appInfo: EngineAPI.INxInfo[]) => {
                        let objects: Array<Promise<EngineAPI.IGenericObjectProperties>> = [];
                        let collection: Array<QlikCollectionObject> = [];
                        for (const iterator of appInfo) {
                            if (excludedObjects.indexOf(iterator.qType)===-1) {
                                objects.push(app.getObject(iterator.qId)
                                    .then((res: EngineAPI.IGenericObject) => {
                                        collection.push(new QlikCollectionObject(res));
                                        return res.getProperties();
                                    })
                                    .catch((error) => {
                                        this.logger.error("ERROR",error);
                                    }));
                            }
                        }
                        Promise.all(objects)
                            .then((res) => {
                                that.qlikObject = new QlikCollection(collection);
                            })
                            .catch((error) => {
                                this.logger.error("ERROR IN CATCH",error);
                            });
                    })
                    .catch((error) => {
                        this.logger.error(error);
                    });
            });
            app.emit("changed");
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
                    //
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

    //#region
    private _headerInputObjects: string;
    public get headerInputObjects() : string {
        return this._headerInputObjects;
    }
    public set headerInputObjects(v : string) {
        this._headerInputObjects = v;
    }
    //#endregion

    static $inject = ["$timeout", "$element", "$scope"];

    constructor(timeout: ng.ITimeoutService, element: JQuery, scope: ng.IScope) {
        this.element = element;
        this.timeout = timeout;
        this.initMenuElements();
        this.initMenuElementsObjecs();
        this.initInputStates();

        $(document).on("click", (e: JQueryEventObject) => {
            try {
                if (element.find(e.target).length === 0) {
                    this.showInputField = false;
                    this.showButtons = false;
                    this.headerInput= null;
                    this.timeout();
                }
            } catch (e) {
                this.logger.error("Error in Constructor with click event", e);
            }
        });

        scope.$watch(() => {
            return this.element.width();
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

    menuListActionCallback(input: string): void {
        switch (input) {
            case "Remove Alternate State":
                this.removeAltState();
                break;

            case "Add Alternate State":
                this.controllingInputBarOptions(eStateName.addAltState);
                break;

            case "Confirm Selection":
                this.applyButtonAction();
        }
    }

    menuListObjecsActionCallback(input: string): void {
        switch (input) {
            case "Apply State":
                this.applyState();
                break;
        }
    }

    private applyState() {
        for (const item of this.selectedObjects) {
            this.model.app.getObject(item)
                .then((res) => {
                    this.qlikObject.getObjectById(item)
                        .then((object) => {
                            object.setState(this.selectedAltState);
                        })
                        .catch((error) => {
                            this.logger.error("error in applyState", error);
                        });
                })
                .catch((error) => {
                    this.logger.error("error in applyStates", error);
                });
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

    private addAltState() {
        this.model.app.addAlternateState(this.headerInput);
    }

    private removeAltState() {
        if (this.selectedAltState) {
            this.model.app.removeAlternateState(this.selectedAltState);
        }
    }

    private applyButtonAction() {
        if(this.inputStates.relStateName === eStateName.addAltState) {
            this.addAltState();
        }
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
    public selectAltStateObjectCallback(pos: number) {
        this.selectedAltState = this.altStateObject.collection[pos].title;
        for (const item of this.altStateObject.collection) {
            item.status = "A";
        }
        this.altStateObject.collection[pos].status = "S";
    }

    /**
     * selectObjectCallback
     */
    public selectObjectCallback(pos: number) {
        let index: number = this.selectedObjects.indexOf(this.qlikObject.collection[pos].id);

        if (index>-1) {
            this.selectedObjects.splice(index,1);
            this.qlikObject.collection[pos].status = "O";
        } else {
            this.selectedObjects.push(this.qlikObject.collection[pos].id);
            this.qlikObject.collection[pos].status = "S";
        }

        this.showButtonsObjects = true;

        if (this.selectedObjects.length>0) {
            this.menuListObjects[0].isEnabled = false;
        } else {
            this.menuListObjects[0].isEnabled = true;
        }
        this.selectedObjects = [];
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
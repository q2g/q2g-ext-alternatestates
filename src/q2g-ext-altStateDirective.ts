//#region imports
import * as template                        from "text!./q2g-ext-altStateDirective.html";
import { utils,
         directives,
         logging }                          from "./node_modules/davinci.js/dist/umd/daVinci";
import { QlikCollection,
         AssistArrayAdapter,
         QlikCollectionObject }             from "./q2g-ext-altStateCollection";
import "css!./q2g-ext-altStateDirective.css";
//#endregion

//#region interfaces
export interface IShortcutProperties {
    shortcutFocusAltStateList: string;
    shortcutFocusSearchField: string;
    shortcutFocusObjectList: string;
    shortcutClearSelection: string;
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

class AltStateController {

    //#region variables
    altStateObject: AssistArrayAdapter<directives.IDataModelItem>;
    app: EngineAPI.IApp;
    element: JQuery;
    focusedPositionAltState: number = 0;
    focusedPositionQbject: number = 0;
    inputBarFocus: boolean = false;
    inputBarFocusObjects: boolean = false;
    inputStates = new utils.StateMachineInput<eStateName>();
    menuList: Array<utils.IMenuElement>;
    menuListObjects: Array<utils.IMenuElement>;
    properties: IShortcutProperties = {
        shortcutFocusAltStateList: " ",
        shortcutFocusSearchField: " ",
        shortcutFocusObjectList: " ",
        shortcutClearSelection: " ",
    };
    qlikObject: QlikCollection;
    scope: ng.IScope;
    selectedObjects: Array<string> = [];
    selectedRootObjects: Array<string> = [];
    showButtons = false;
    showButtonsObjects = false;
    showFocusedAltState: boolean = false;
    showFocusedObject: boolean = false;
    showInputField: boolean = false;
    showInputFieldObjects: boolean = false;
    showSearchFieldState = true;
    theme: string;
    timeout: ng.ITimeoutService;
    titleAltState: string = "Alternate State";
    warningMsg: string;
    //#endregion

    //#region editMode
    private _editMode : boolean;
    public get editMode() : boolean {
        return this._editMode;
    }
    public set editMode(v : boolean) {
        if (v !== this._editMode) {
            this._editMode = v;
        }
    }
    //#endregion

    //#region selectedAltState
    private _selectedAltState: string = "";
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
            this.app = v.app;

            this.model.app.addAlternateState("q2gAssistStateDefault09832465021234")
                .then(() => {
                    return this.app.doSave();
                })
                .then(() => {
                    return this.app.removeAlternateState("q2gAssistStateDefault09832465021234");
                })
                .then(() => {
                    return this.app.doSave();
                })
            .catch((error) => {
                this.logger.error("ERROR in setter of model when applying pseudo alt state", error);
            })

            const propertiesSheetList: EngineAPI.IGenericObjectProperties = {
                qAppObjectListDef: {
                    qData: {
                        cells: "/cells",
                        columns: "/columns",
                        description: "/qMetaDef/description",
                        descriptionExpression: "/descriptionExpression",
                        labelExpression: "/labelExpression",
                        rank: "/rank",
                        rows: "/rows",
                        thumbnail: "/thumbnail",
                        title: "/qMetaDef/title"
                    },
                    qType: "sheet"
                },
                qInfo: {
                    qId: "SheetList",
                    qType: "SheetList"
                }
            }

            this.app.createSessionObject(propertiesSheetList)
                .then((object) => {
                    object.on("changed", function () {
                        this.app.emit("changed");
                        this.getLayout();
                    })
                    object.emit("changed");
                })
            .catch((error) => {
                this.logger.error("ERROR in setter of model when creating session object for sheelts", error);
            });

            let that: AltStateController = this;
            this.app.on("changed", function () {
                that.logger.info("CHANGED APP", "");
                v.getProperties()
                    .then((res) => {
                        return that.getProperties(res.properties);
                    })
                    .then(() => {
                        return this.app.getAppLayout();
                    })
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
                    })
                    .then(() => {
                        if (that.altStateObject.collection.length > 0 && that.selectedAltState === "") {
                            that.selectAltStateObjectCallback(0);
                        }
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
                                that.timeout(300)
                                .then(() => {
                                    that.warningMsg = that.createWarningMessage();
                                });
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

    //#region private functions

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
            this.qlikObject.getObjectById(item)
                .then((object) => {
                    return object.setState(this.selectedAltState);
                })
                .then((object) => {
                    this.app.doSave();
                })
            .catch((error) => {
                this.logger.error("error in applyStates", error);
            });
        }

        for (const item of this.selectedRootObjects) {
            this.qlikObject.getObjectById(item)
                .then((object) => {
                    return object.setState("$");
                })
                .then((object) => {
                    this.app.doSave();
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
        this.logger.info("addAltState", "");

        this.app.addAlternateState(this.headerInput)
            .then(() => {
                this.logger.info("addAltState inner", "");
                this.headerInput = "";
                this.showInputField = false;
                return this.app.doSave();
            })
        .catch((error) => {
            this.logger.error("error in addAltState", error);
        });
    }

    /**
     * removes a slternate state from the app
     */
    private removeAltState() {
        this.logger.info("removeAltState", "");

        if (this.selectedAltState) {
            this.app.removeAlternateState(this.selectedAltState)
                .then(() => {

                    this.selectedAltState = "";
                    return this.app.doSave();
                })
            .catch((error) => {
                this.logger.error("Error in removeAltState", error);
            });
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
     * checks if all linked alternate states exists in the app
     */
    private checkForMissingAlternateStates(): Array<string> {
        let listOfMissingAltStates: Array<string> = [];

        for (const object of this.qlikObject.collection) {
            let checker: boolean = false;
            if (object.state === "$") {
                continue;
            }

            for (const altStateObject of this.altStateObject.collection) {
                if (altStateObject.title === object.state || object.state === "$") {
                    checker = true;
                    break;
                }
            }
            if (!checker && listOfMissingAltStates.indexOf(object.state) === -1) {
                listOfMissingAltStates.push(object.state);
            }
        }

        return listOfMissingAltStates;
    }

    /**
     * creates the warning message when objects have no registrated states
     */
    private createWarningMessage(): string {
        let msg: string = "";
        let missingAltState: Array<string> = this.checkForMissingAlternateStates();

        if (missingAltState.length > 0) {
            let states: string = missingAltState.join("; ");
            msg = `WARNING objects have not registrated states (${states}).`;
        }

        return msg;
    }

    /**
     * saves the Properties from the getLayout call from qlik enine in own Object
     * @param properties Properties from getLayout call
     */
    private getProperties(properties: any): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.properties.shortcutFocusAltStateList = properties.shortcutFocusAltStateList;
            this.properties.shortcutFocusObjectList = properties.shortcutFocusObjectList;
            this.properties.shortcutFocusSearchField = properties.shortcutFocusSearchField;
            this.properties.shortcutClearSelection = properties.shortcutClearSelection;
            resolve();
        });
    }

    //#endregion

    //#region public functions

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
                this.headerInputObjects = "";
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
        this.showFocusedAltState = true;

        if (this.selectedObjects.length > 0 || this.selectedRootObjects.length > 0) {
            this.menuListObjects[0].isEnabled = false;
        } else {
            this.menuListObjects[0].isEnabled = true;
        }
        this.menuListObjects = JSON.parse(JSON.stringify(this.menuListObjects));
    }

    /**
     * shortcuthandler to clears the made selection
     * @param objectShortcut object wich gives you the shortcut name and the element, from which the shortcut come from
     */
    shortcutHandler(shortcutObject: directives.IShortcutObject, domcontainer: utils.IDomContainer): boolean {
        switch (shortcutObject.name) {
            case "escAltState":
                try {
                    if (this.headerInput === "") {
                        this.showInputField = false;
                    }
                    return true;
                } catch (e) {
                    this.logger.error("Error in shortcutHandlerExtensionHeader", e);
                    return false;
                }

            case "escObjects":
                try {
                    if (this.headerInputObjects === "") {
                        this.showInputFieldObjects = false;
                    }
                    return true;
                } catch (e) {
                    this.logger.error("Error in shortcutHandlerExtensionHeader", e);
                    return false;
                }
            case "focusAltStateList":
                try {
                    this.showFocusedAltState = true;
                    this.showFocusedObject = false;
                    this.timeout();
                    if (this.focusedPositionAltState < 0) {
                        this.focusedPositionAltState = 0;
                        domcontainer.element.children().children().children()[0].focus();
                        this.timeout();
                        return true;
                    }

                    if (this.focusedPositionAltState >= this.altStateObject.collection.length) {
                        this.focusedPositionAltState = 0;
                        domcontainer.element.children().children().children()[0].focus();
                        this.timeout();
                        return true;
                    }

                    if (this.focusedPositionAltState < this.altStateObject.itemsPageTop) {
                        this.altStateObject.itemsPageTop = this.focusedPositionAltState;
                    } else if (this.focusedPositionAltState >
                        this.altStateObject.itemsPageTop + this.altStateObject.itemsPageSize) {
                        this.altStateObject.itemsPageTop
                            = this.focusedPositionAltState - (this.altStateObject.itemsPageSize + 1);

                    }

                    domcontainer.element.children().children().children().children()[
                        this.focusedPositionAltState - this.altStateObject.itemsPageTop
                    ].focus();
                    return true;

                } catch (error) {
                    this.logger.error("Error in shortcutHandlerExtensionHeader", error);
                    return false;
                }
            case "focusObjectList":
                this.showFocusedAltState = false;
                this.showFocusedObject = true;
                this.timeout();
                if (this.altStateObject.collection) {
                    if (this.focusedPositionQbject < 0 ||
                        this.focusedPositionQbject >= this.altStateObject.collection.length ||
                        this.focusedPositionQbject >= this.altStateObject.itemsPageSize + this.altStateObject.itemsPageTop) {
                        this.focusedPositionQbject = 0;
                        this.altStateObject.itemsPageTop = 0;
                        domcontainer.element.children().children().children().children()[0].focus();
                        this.timeout();
                        return true;
                    }

                    if (this.focusedPositionQbject < this.altStateObject.itemsPageTop) {
                        this.altStateObject.itemsPageTop = this.focusedPositionQbject;
                    } else if (this.focusedPositionQbject > this.altStateObject.itemsPageTop + this.altStateObject.itemsPageSize) {
                        this.altStateObject.itemsPageTop = this.focusedPositionQbject - (this.altStateObject.itemsPageSize + 1);
                    }
                    domcontainer.element.children().children().children().children()[
                        this.focusedPositionQbject - this.altStateObject.itemsPageTop
                    ].focus();
                }
                return true;
            case "applySelection":
                this.menuListObjecsActionCallback("Apply State");
        }
    }

    //#endregion

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
            utils.checkDirectiveIsRegistrated($injector, $registrationProvider, rootNameSpace,
                directives.ShortCutDirectiveFactory(rootNameSpace), "Shortcut");
        }
    };
    };
}
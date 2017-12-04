//#region variables
import { utils, directives, logging } from "../node_modules/davinci.js/dist/daVinci";
import * as template from "text!./q2g-ext-altStateDirective.html";
//#endregion

class AssistArrayAdapter<T> {

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
        console.log(arr);
        this.preClacCollection = arr;
        this.itemsCount = arr.length;
        this.itemsPageTop = 0;
        console.log(arr);
        this.calcDataPages(this.itemsPageTop, this.itemsPageSize);
    }

    private calcDataPages(pageTop: number, pageSize: number): Promise<Array<T>> {
        return new Promise((resolve, reject) => {
            try {
                console.log("#######", pageTop, pageSize);
                resolve(this.preClacCollection.slice(pageTop, pageTop + pageSize));
            } catch (error) {
                this.logger.error("Error in getListObjectData", error);
                reject(error);
            }
        });
    }


}

const arr = [
    "masterobject",
    "sheet",
    "slider",
    "slideritem",
    "embeddedsnapshot",
    "dimension",
    "measure",
    "snapshot",
    "bookmark",
    "slideitem",
    "slide",
    "LoadModel",
    "story"
];

class AltStateController {

    altStateObject: AssistArrayAdapter<directives.IDataModelItem>;
    qlikObjectObjectv: AssistArrayAdapter<directives.IDataModelItem>;
    addState: string;
    element: JQuery;
    timeout: ng.ITimeoutService;
    theme: string;
    editMode: boolean = false;
    menuList: Array<utils.IMenuElement>;
    showSearchFieldState = true;
    showButtonsState = true;

    //#region model
    private _model: EngineAPI.IGenericObject;
    public get model(): EngineAPI.IGenericObject {
        return this._model;
    }
    public set model(v: EngineAPI.IGenericObject) {
        if (v !== this._model) {
            this._model = v;
            let that = this;
            let app: any = v.app;
            app.on("changed", function () {
                app.getLayout()
                    .then((appLayout: EngineAPI.INxAppLayout) => {
                        let collection: Array<directives.IDataModelItem> = [];
                        for (const iterator of appLayout.qStateNames) {
                            collection.push({
                                fieldDef: "",
                                hasFocus: false,
                                id: iterator,
                                qElementNumber: -1,
                                status: "O",
                                title: iterator
                            });
                        }
                        that.altStateObject = new AssistArrayAdapter(collection);
                    })
                    .catch((error) => {
                        console.error("ERROR in get Layout ", error);
                    });
                app.getAllInfos()
                    .then((appInfo: EngineAPI.INxInfo[]) => {
                        let objects: Array<Promise<EngineAPI.IGenericObjectProperties>> = [];
                        for (const iterator of appInfo) {
                            if (arr.indexOf(iterator.qType)===-1) {
                                objects.push(app.getObject(iterator.qId)
                                    .then((res: EngineAPI.IGenericObject) => {
                                        return res.getProperties();
                                    })
                                    .catch((error) => {
                                        console.error(error);
                                    }));
                            }
                        }
                        Promise.all(objects)
                            .then((res) => {
                                let collection: Array<directives.IDataModelItem> = [];
                                for (const iterator of res) {
                                    if(iterator) {
                                        collection.push({
                                            fieldDef: "",
                                            hasFocus: false,
                                            id: iterator.qInfo.qId,
                                            qElementNumber: -1,
                                            status: "O",
                                            title: iterator.qInfo.qType+"-"+iterator.qInfo.qId
                                        });
                                    }
                                }
                                console.log(that);
                                that.qlikObjectObjectv = new AssistArrayAdapter(collection);
                            })
                            .catch((error) => {
                                console.error("ERROR IN CATCH",error);
                            });
                    })
                    .catch((error) => {
                        console.error(error);
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
                console.error("error in setter of elementHeight", err);
            }
        }
    }
    //#endregion

    static $inject = ["$timeout", "$element", "$scope"];

    constructor(timeout: ng.ITimeoutService, element: JQuery, scope: ng.IScope) {
        this.element = element;
        this.timeout = timeout;
        this.initMenuElements();

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
            hasSeparator: false,
            type: "menu"

        });
    }

    menuListActionCallback(input: any) {
        console.log(input);
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
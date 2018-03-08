//#region imports
import {directives,
        logging }          from "../node_modules/davinci.js/dist/umd/daVinci";
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

/**
 * object with information of the qlik client objects
 */
export class QlikCollectionObject implements IDataModelItemObject {

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
                        this.state = properties.qHyperCubeDef.qStateName;
                    }
                        this.patchOperation = (typeof(properties.qHyperCubeDef.qStateName) === "undefined")? "Add": "Replace";
                } else if (properties.qListObjectDef) {
                    this.path = "/qListObjectDef/qStateName";
                    if (properties.qListObjectDef.qStateName) {
                        this.state = properties.qListObjectDef.qStateName;
                    }
                    this.patchOperation = (typeof(properties.qListObjectDef.qStateName) === "undefined")? "Add": "Replace";
                } else if (properties.qChildListDef) {
                    this.path = "/qChildListDef/qStateName";
                    if (properties.qChildListDef.qStateName) {
                        this.state = properties.qChildListDef.qStateName;
                    }
                    this.patchOperation = (typeof(properties.qChildListDef.qStateName) === "undefined")? "Add": "Replace";
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
                qPath: this.path,
                qOp: this.patchOperation,
                qValue: "\""+stateName+"\""
            };
            this.object.getProperties()
            .then((res) => {
                console.log("asdgfsadgasdgdsafdsa", res);
                if(typeof(res.qListObjectDef) === "object") {
                    res.qListObjectDef.qStateName = stateName;
                } else if (typeof(res.qHyperCubeDef) === "object") {
                    res.qHyperCubeDef.qStateName = stateName;
                }
                return this.object.setProperties(res);
            })
            // this.object.applyPatches([patchObject], false)
                // .then(() => {
                //     return this.object.getFullPropertyTree()
                // })
                // .then((res) => {
                //     return this.object.setFullPropertyTree(res);
                // })
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
export class AssistArrayAdapter<T extends directives.IDataModelItem> {

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
    updateCollection(elements: T[]): Promise<boolean> {
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
export class QlikCollection extends AssistArrayAdapter<QlikCollectionObject> {

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
    updateCollection(elements: QlikCollectionObject[]): Promise<boolean> {
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
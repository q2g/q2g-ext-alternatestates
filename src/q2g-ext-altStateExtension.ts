//#region imports
import * as qvangular from "qvangular";
import * as qlik from "qlik";
import * as template from "text!./q2g-ext-altStateExtension.html";
import { utils, version, services, logging } from "../node_modules/davinci.js/dist/umd/daVinci";
import { AltStateDirectiveFactory } from "./q2g-ext-altStateDirective";
//#endregion

//#region registrate services
qvangular.service<services.IRegistrationProvider>("$registrationProvider", services.RegistrationProvider)
.implementObject(qvangular);
//#endregion

//#region logger
logging.LogConfig.SetLogLevel("*", logging.LogLevel.error);
let logger = new logging.Logger("Main");
//#endregion

//#region registrate directions
var $injector = qvangular.$injector;
utils.checkDirectiveIsRegistrated($injector, qvangular, "", AltStateDirectiveFactory("Altstateextension"),
    "AltStateExtension");
//#endregion

//#region extension properties
let parameter = {
    type: "items",
    component: "accordion",
    items: {
        settings: {
            uses: "settings",
            items: {
                accessibility: {
                    type: "items",
                    label: "Accessibility",
                    grouped: true,
                    items: {
                        shortcuts: {
                            type: "items",
                            lable: "shortcuts",
                            grouped: false,
                            items: {
                                ShortcutLable: {
                                    label: "In the following, you can change the used shortcuts",
                                    component: "text"
                                },
                                shortcutUseDefaults: {
                                    ref: "properties.shortcutUseDefaults",
                                    label: "use default shortcuts",
                                    component: "switch",
                                    type: "boolean",
                                    options: [{
                                        value: true,
                                        label: "use"
                                    }, {
                                        value: false,
                                        label: "not use"
                                    }],
                                    defaultValue: true
                                },
                                shortcutFocusAltStateList: {
                                    ref: "properties.shortcutFocusAltStateList",
                                    label: "focus alternate state list",
                                    type: "string",
                                    defaultValue: "strg + alt + 70",
                                    show: function (data: any) {
                                        if (data.properties.shortcutUseDefaults) {
                                            data.properties.shortcutFocusAltStateList = "strg + alt + 70";
                                        }
                                        return !data.properties.shortcutUseDefaults;
                                    }
                                },
                                shortcutFocusSearchField: {
                                    ref: "properties.shortcutFocusSearchField",
                                    label: "focus search field",
                                    type: "string",
                                    defaultValue: "strg + alt + 83",
                                    show: function (data: any) {
                                        if (data.properties.shortcutUseDefaults) {
                                            data.properties.shortcutFocusSearchField = "strg + alt + 83";
                                        }
                                        return !data.properties.shortcutUseDefaults;
                                    }
                                },
                                shortcutFocusObjectList: {
                                    ref: "properties.shortcutFocusObjectList",
                                    label: "focus object list",
                                    type: "string",
                                    defaultValue: "strg + alt + 87",
                                    show: function (data: any) {
                                        if (data.properties.shortcutUseDefaults) {
                                            data.properties.shortcutFocusObjectList = "strg + alt + 87";
                                        }
                                        return !data.properties.shortcutUseDefaults;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};
//#endregion

class AlternateStateExtension {

    model: EngineAPI.IGenericObject;

    constructor(model: EngineAPI.IGenericObject) {
        this.model = model;
    }

    public isEditMode() {
        try {
            if(qlik.navigation.getMode() === "analysis") {
                return false;
            } else {
                return true;
            }
        } catch (error) {
            console.error("Error in function isEditMode", error);
            return true;
        }
    }
}

export = {
    definition: parameter,
    initialProperties: {},
    template: template,
    support: {
        snapshot: false,
        export: false,
        exportData: false
    },
    paint: () => {
        //
    },
    resize: () => {
        //
    },
    controller: ["$scope", (scope:utils.IVMScope<AlternateStateExtension>) => {
        console.log("this Extension runs under daVinci Version", version);
        scope.vm = new AlternateStateExtension(utils.getEnigma(scope));

    }]
};
//#region
import * as qvangular from "qvangular";
import * as qlik from "qlik";
import * as template from "text!./q2g-ext-altStateExtension.html";
import { utils, version, services, logging } from "../node_modules/davinci.js/dist/daVinci";
import { AltStateDirectiveFactory } from "./q2g-ext-altStateDirective";
//#endregion

//#region registrate services
qvangular.service<services.IRegistrationProvider>("$registrationProvider", services.RegistrationProvider)
.implementObject(qvangular);
//#endregion

//#region logger
logging.LogConfig.SetLogLevel("*", logging.LogLevel.info);
let logger = new logging.Logger("Main");
//#endregion

var $injector = qvangular.$injector;
utils.checkDirectiveIsRegistrated($injector, qvangular, "", AltStateDirectiveFactory("Altstateextension"),
    "AltStateExtension");

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

    /**
     * paint
     */
    public paint() {
        console.log("Test");
    }

}

export = {
    definition: {},
    initialProperties: {},
    template: template,
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
/* Info Popup and Inventory management
 */

class InfoPopUp {
    constructor(satelliteCollection) {

        this._satcollection = satelliteCollection;

        this._$modal = $("#satelliteModal");
        this._$title = $("#satelliteName");
        this._$infoframe = $("#info_frame");
        this._$button = $("#collectButton");
        this._$collected = $("#collectedSatelliteYES");
        this._$notcollected = $("#collectedSatelliteNO");
        this._$canvas = $("#modelCanvas");
        this._$statsframe = $("#stats_frame");
        this._$inventory = $('#inventoryContainer');

        this._currentDesignator = null;
    }

    show(userObject) {
        const info = this._parseUserObject(userObject);
        if (!info) {
            console.error("ERROR: userObject has no displayName");
            return;
        }
        this._$statsframe.attr('src', this.shinyapp_url(info.designator));
        this._$infoframe.attr('src', this.celestrak_url(info.launch_year, info.launch_number, info.launch_piece));
        this._$title.text(info.designator);
        this._$button.data("designator", info.designator);

        this._currentDesignator = info.designator;
        this.renderInventory(info.designator);
        // show
        this._$modal.modal();
    }

    celestrak_url(launch_year, launch_number, launch_piece) {
        // internal designator id looks like 1964-063B
        // data example https://celestrak.com/satcat/1964/1964-063.php#C
        if (parseInt(launch_year) > 2012) {  // past the year 2012, there are no info pages anymore on celestrak
            return "./nosatcat.html";
        }
        return "https://celestrak.com/satcat/" + launch_year + "/" + launch_number + ".php#" + launch_piece;
    }

    shinyapp_url(designator) {
        return 'https://majortom-backend.shinyapps.io/majortom/?designator=' + designator;
    }

    _parseUserObject(userObject) {
        const shortDesignator = userObject.displayName.trim();
        if (!shortDesignator) {
            return null;
        }
        const launch_YY = shortDesignator.slice(0, 2);
        const launch_number = shortDesignator.slice(2, 5);
        const launch_piece = shortDesignator.slice(5);
        const launch_year = parseInt(launch_YY) > 60 ? "19" + launch_YY : "20" + launch_YY;
        return {
            launch_year: launch_year,
            launch_number: launch_number,
            launch_piece: launch_piece,
            shortDesignator: shortDesignator,
            designator: launch_year + "-" + launch_number + launch_piece
        }
    }

    getCategory(designator) {
        // workaround... the categories are fakes anyways, so don't worry about it
        const shortDesignator = designator.slice(2,4) + designator.slice(5);
        return majorTomRenderer.getCategory(shortDesignator);
    }

    _getCategoryModel(category) {
        // same workaround...
        return majorTomRenderer._categoryModels.get(category)
    }

    renderInventory() {
        const designator = this._currentDesignator;
        this._$inventory.empty();
        for (let designator of this._satcollection) {

            let category = this.getCategory(designator);

            let li = $('<li style="margin:10px;">');
            let image = $('<img alt="satellite" style="width:60px;height:60px;" src="/resources/models/' + category + '.jpg">');
            let name = $("<span>").text(designator);

            li.append(image);
            li.append(name);
            this._$inventory.append(li);
        }

        if (this._satcollection.has(designator)) {
            this._$notcollected.hide();
            this._$collected.show();
        } else {
            this._$collected.hide();
            this._$notcollected.show();
        }

        console.log("satellites collected:", satelliteCollection.length);
    }

    render3DModel() {
        let cWidth = this._$canvas.parent().innerWidth();
        this._$canvas.width(cWidth).height(480);
        const designator = this._currentDesignator;
        const modelwwd = new WorldWind.WorldWindow(this._$canvas.attr('id'));
        const modelLayer = new WorldWind.RenderableLayer("satellites");
        modelwwd.addLayer(modelLayer);
        modelLayer.removeAllRenderables();
        let satPos = new WorldWind.Position(0, 0, 0);
        let viewPos = new WorldWind.Position(satPos.latitude, satPos.longitude, satPos.altitude + 300000);
        modelwwd.goTo(viewPos);

        let colladaLoader = new WorldWind.ColladaLoader(satPos);
        let category = this.getCategory(designator);
        colladaLoader.init({dirPath: './resources/models/' + category + '/'});
        let scene = colladaLoader.parse(this._getCategoryModel(category));
        scene.displayName = designator;
        scene.scale = 10000;
        scene.position = satPos;
        scene.altitudeMode = WorldWind.ABSOLUTE;
        scene.xRotation = -35.0;
        scene.yRotation = -35.0;
        scene.zRotation = -35.0;
        modelLayer.addRenderable(scene);
    }
}


class SatelliteCollection {
    constructor() {
        this._name = 'majortom';
        let collected = this._get();
        this._collected = collected ? JSON.parse(collected) : [];
    }

    add(designator) {
        if (!this.has(designator)) {
            this._collected.push(designator);
            this._set(JSON.stringify(this._collected));
        }
    }

    clear() {
        this._collected = [];
        this._set(JSON.stringify(this._collected));
    }

    has(designator) {
        return this._collected.includes(designator);
    }

    [Symbol.iterator]() {
        return this._collected[Symbol.iterator]();
    }

    get length() {
        return this._collected.length;
    }

    _get() {
        let nameEQ = this._name + "=";
        let ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i += 1) {
            let c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1, c.length);
            }  // remove whitespace
            if (c.indexOf(nameEQ) === 0) {
                return c.substring(nameEQ.length, c.length);
            }
        }
        return null;
    }

    _set(value, days) {
        let expires = "";
        if (days) {
            let date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = this._name + "=" + (value || "")  + expires + "; path=/";
    }
}

const satelliteCollection = new SatelliteCollection();
const satelliteInfoPopUp = new InfoPopUp(satelliteCollection);
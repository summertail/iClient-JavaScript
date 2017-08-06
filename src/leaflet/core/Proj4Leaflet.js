import L from "leaflet";
import proj4 from "proj4";
L.Proj = {};

L.Proj._isProj4Obj = function (a) {
    return (typeof a.inverse !== 'undefined' &&
    typeof a.forward !== 'undefined');
};

L.Proj.Projection = L.Class.extend({
    initialize: function (code, def, bounds) {
        var isP4 = L.Proj._isProj4Obj(code);
        this._proj = isP4 ? code : this._projFromCodeDef(code, def);
        var boundsOption = bounds;
        if (L.Util.isArray(bounds)) {
            boundsOption = L.bounds(bounds);
        }
        this.bounds = isP4 ? def : boundsOption;
    },

    project: function (latlng) {
        var point = this._proj.forward([latlng.lng, latlng.lat]);
        return new L.Point(point[0], point[1]);
    },

    unproject: function (point, unbounded) {
        var point2 = this._proj.inverse([point.x, point.y]);
        return new L.LatLng(point2[1], point2[0], unbounded);
    },

    _projFromCodeDef: function (code, def) {
        if (def) {
            proj4.defs(code, def);
        } else if (proj4.defs[code] === undefined) {
            var urn = code.split(':');
            if (urn.length > 3) {
                code = urn[urn.length - 3] + ':' + urn[urn.length - 1];
            }
            if (proj4.defs[code] === undefined) {
                throw 'No projection definition for code ' + code;
            }
        }

        return proj4(code);
    }
});
/**
 * @class L.Proj.CRS
 * @description leaflet Proj投影定义类
 * @extends  L.CRS
 * @example
 * 用法：
 *    var crs =new L.Proj.CRS("EPSG:4326", '', {
 *          origin: [-180,90],
 *          scaleDenominators: [2000,1000,500,200,100,50,20,10],
 *    });
 *    var map=L.map('map', {
 *       crs: crs
 *      ...
 *    })
 */

L.Proj.CRS = L.Class.extend({
    includes: L.CRS,

    options: {
        transformation: new L.Transformation(1, 0, -1, 0)
    },

    /**
     * @function L.Proj.CRS.prototype.initialize
     * @description L.Proj.CRS 投影类构造函数
     * @param a -{String} proj srsCode。
     * @param b -{String} proj def。
     * @param c -{Object} options。可选参数：<br>
     *                     origin -{Array|L.Point} 原点。必填<br>
     *                     scales -{Array} 比例尺数组 <br>
     *                     scaleDenominators -{Array} 比例尺分母数组 <br>
     *                     resolutions -{Array} 分辨率数组 <br>
     *                     bounds -{Array|L.Bounds} 范围 <br>
     */
    initialize: function (a, b, c) {
        var code,
            proj,
            def,
            options;

        if (L.Proj._isProj4Obj(a)) {
            proj = a;
            code = proj.srsCode;
            options = b || {};

            this.projection = new L.Proj.Projection(proj, options.bounds);
        } else {
            code = a;
            def = b;
            options = c || {};
            this.projection = new L.Proj.Projection(code, def, options.bounds);
        }

        L.Util.setOptions(this, options);
        this.code = code;
        this.transformation = this.options.transformation;

        if (this.options.origin) {
            if (this.options.origin instanceof L.Point) {
                this.options.origin = [this.options.origin.x, this.options.origin.y];
            }
            this.transformation =
                new L.Transformation(1, -this.options.origin[0],
                    -1, this.options.origin[1]);
        }

        if (this.options.scales) {
            this._scales = this._toProj4Scales(this.options.scales);
        } else if (this.options.scaleDenominators) {
            var scales = [];
            for (var i = 0; i < this.options.scaleDenominators.length; i++) {
                scales[i] = 1 / this.options.scaleDenominators[i];
            }
            this._scales = this._toProj4Scales(scales);
        } else if (this.options.resolutions) {
            this._scales = [];
            for (var i = this.options.resolutions.length - 1; i >= 0; i--) {
                if (this.options.resolutions[i]) {
                    this._scales[i] = 1 / this.options.resolutions[i];
                }
            }
        } else if (this.options.bounds) {
            this._scales = this._getDefaultProj4ScalesByBounds(this.options.bounds);
        }

        this.infinite = !this.options.bounds;

    },

    scale: function (zoom) {
        var iZoom = Math.floor(zoom),
            baseScale,
            nextScale,
            scaleDiff,
            zDiff;
        if (zoom === iZoom) {
            return this._scales[zoom];
        } else {
            // Non-integer zoom, interpolate
            baseScale = this._scales[iZoom];
            nextScale = this._scales[iZoom + 1];
            scaleDiff = nextScale - baseScale;
            zDiff = (zoom - iZoom);
            return baseScale + scaleDiff * zDiff;
        }
    },

    zoom: function (scale) {
        // Find closest number in this._scales, down
        var downScale = this._closestElement(this._scales, scale),
            downZoom = this._scales.indexOf(downScale),
            nextScale,
            nextZoom,
            scaleDiff;
        // Check if scale is downScale => return array index
        if (scale === downScale) {
            return downZoom;
        }
        // Interpolate
        nextZoom = downZoom + 1;
        nextScale = this._scales[nextZoom];
        if (nextScale === undefined) {
            return Infinity;
        }
        scaleDiff = nextScale - downScale;
        return (scale - downScale) / scaleDiff + downZoom;
    },

    distance: L.CRS.Earth.distance,

    R: L.CRS.Earth.R,

    /* Get the closest lowest element in an array */
    _closestElement: function (array, element) {
        var low;
        for (var i = array.length; i--;) {
            if (array[i] <= element && (low === undefined || low < array[i])) {
                low = array[i];
            }
        }
        return low;
    },

    _toProj4Scales: function (scales) {
        var proj4Scales = [];
        if (!scales) {
            return proj4Scales;
        }
        for (var i = 0; i < scales.length; i++) {
            proj4Scales[i] = (96 * scales[i]) / 0.0254;
        }
        return proj4Scales;
    },

    _getDefaultProj4ScalesByBounds: function (bounds) {
        if (!bounds) {
            return [];
        }
        var boundsSize = L.bounds(bounds).getSize();
        var extendsSize = Math.max(boundsSize.x, boundsSize.y);
        var resolution = extendsSize / 256;
        var scales = [];
        var maxZoom = 23;
        for (var i = 0; i < maxZoom; i++) {
            scales[i] = Math.pow(2, i) / resolution;
        }
        return scales;
    }
});

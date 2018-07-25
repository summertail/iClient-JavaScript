﻿import {SuperMap} from '../../SuperMap';
import {MultiPoint} from './MultiPoint';

/**
 * @class SuperMap.Geometry.Curve
 * @classdesc 几何对象曲线类。
 * @category BaseTypes Geometry
 * @extends {SuperMap.Geometry.MultiPoint}
 * @param {Array.<SuperMap.Geometry.Point>} components - 几何对象数组。
 * @example
 * var point1 = new SuperMap.Geometry.Point(10,20);
 * var point2 = new SuperMap.Geometry.Point(30,40);
 * var curve = new SuperMap.Geometry.Curve([point1,point2]);
 */
export class Curve extends MultiPoint {

    constructor(components) {
        super(components);
        /**
         * @member {Array.<string>} [SuperMap.Geometry.Curve.prototype.componentType=["SuperMap.Geometry.Point", "SuperMap.PointWithMeasure"]]
         * @description components 存储的的几何对象所支持的几何类型数组。
         * @readonly
         */
        this.componentTypes = ["SuperMap.Geometry.Point", "SuperMap.PointWithMeasure"];
        this.CLASS_NAME = "SuperMap.Geometry.Curve";
    }


}

SuperMap.Geometry.Curve = Curve;
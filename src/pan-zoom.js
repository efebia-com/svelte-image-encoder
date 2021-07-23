"use strict";
exports.__esModule = true;
var detect_pointer_events_1 = require("detect-pointer-events");
// Firefox resets some properties in stored/cached 
// Event objects when new events are fired so
// we have to store a clone.
// TODO: Should we store the original object when using Chrome?
function iterationCopy(src) {
    var target = {};
    for (var prop in src) {
        target[prop] = src[prop];
    }
    return target;
}
function updateScale(transform, s, x, y) {
    var minScale = transform.getMinScale();
    var scale = transform.getScale();
    if (s < minScale)
        s = minScale;
    var offsetX = transform.getOffsetX();
    var offsetY = transform.getOffsetY();
    offsetX = s * (offsetX + x) / scale - x;
    offsetY = s * (offsetY + y) / scale - y;
    transform.setOffsetX(offsetX);
    transform.setOffsetY(offsetY);
    transform.setScale(s);
}
function simpleDragZoom(e, scaleOrigin, transform) {
    if (e.shiftKey) { //scale
        if (!scaleOrigin)
            scaleOrigin = { x: e.offsetX, y: e.offsetY, s: transform.getScale() };
        updateScale(transform, scaleOrigin.s + (scaleOrigin.y - e.offsetY) / 50, scaleOrigin.x, scaleOrigin.y);
    }
    else { //drag
        scaleOrigin = null;
        var offsetX = transform.getOffsetX();
        var offsetY = transform.getOffsetY();
        offsetX -= e.movementX;
        offsetY -= e.movementY;
        transform.setOffsetX(offsetX);
        transform.setOffsetY(offsetY);
    }
    return scaleOrigin;
}
function withPointers(node, transform) {
    function rescaleWithWheel(e) {
        e.preventDefault();
        e.cancelBubble = true;
        var delta = Math.sign(e.deltaY);
        updateScale(transform, transform.getScale() - delta / 10, e.offsetX, e.offsetY);
    }
    // pointer event cache
    var pointers = [];
    function storeEvent(ev) {
        for (var i = 0; i < pointers.length; i++) {
            if (pointers[i].pointerId === ev.pointerId) {
                var ev2 = iterationCopy(ev);
                pointers[i] = ev2;
                break;
            }
        }
        if (i === pointers.length)
            pointers.push(ev);
    }
    function removeEvent(ev) {
        for (var i = 0; i < pointers.length; i++) {
            if (pointers[i].pointerId === ev.pointerId) {
                pointers.splice(i, 1);
                break;
            }
        }
    }
    var scaleOrigin = null;
    function startDrag(e) {
        node.setPointerCapture(e.pointerId);
        if (!transform.getDragging()) {
            node.addEventListener(detect_pointer_events_1["default"].prefix('pointermove'), drag, true);
            transform.setDragging(true);
        }
        e.preventDefault();
        e.cancelBubble = true;
        storeEvent(e);
    }
    function drag(e) {
        if (pointers.length === 1) {
            scaleOrigin = simpleDragZoom(e, scaleOrigin, transform);
        }
        else if (pointers.length === 2) { //scale
            var x0 = pointers[0].offsetX;
            var y0 = pointers[0].offsetY;
            var x1 = pointers[1].offsetX;
            var y1 = pointers[1].offsetY;
            var x2 = e.offsetX;
            var y2 = e.offsetY;
            var dx = x0 - x1;
            var dy = y0 - y1;
            var l1 = Math.sqrt(dx * dx + dy * dy);
            var dx1 = void 0, dy1 = void 0;
            if (e.pointerId === pointers[0].pointerId) {
                dx1 = x2 - x1;
                dy1 = y2 - y1;
            }
            else {
                dx1 = x2 - x0;
                dy1 = y2 - y0;
            }
            var l2 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
            updateScale(transform, transform.getScale() * l2 / l1, x2, y2);
        }
        e.preventDefault();
        e.cancelBubble = true;
        storeEvent(e);
    }
    function stopDrag(e) {
        e.preventDefault();
        e.cancelBubble = true;
        removeEvent(e);
        node.releasePointerCapture(e.pointerId);
        if (pointers.length === 0) {
            transform.setDragging(false);
            node.removeEventListener(detect_pointer_events_1["default"].prefix('pointermove'), drag, true);
            scaleOrigin = null;
        }
    }
    node.addEventListener(detect_pointer_events_1["default"].prefix('pointerdown'), startDrag, true);
    node.addEventListener(detect_pointer_events_1["default"].prefix('pointerup'), stopDrag, true);
    node.addEventListener('wheel', rescaleWithWheel, true);
    return function () {
        node.removeEventListener(detect_pointer_events_1["default"].prefix('pointerdown'), startDrag, true);
        node.removeEventListener(detect_pointer_events_1["default"].prefix('pointerup'), stopDrag, true);
        node.removeEventListener('wheel', rescaleWithWheel, true);
    };
}
function withMouse(node, transform) {
    function rescaleWithWheel(e) {
        e.preventDefault();
        e.cancelBubble = true;
        var delta = Math.sign(e.deltaY);
        updateScale(transform, transform.getScale() - delta / 10, e.offsetX, e.offsetY);
    }
    var scaleOrigin = null;
    function startDrag(e) {
        if (typeof node.setCapture === 'function')
            node.setCapture();
        if (!transform.getDragging()) {
            node.addEventListener('mousemove', drag, true);
            window.addEventListener('mouseup', stopDrag, true);
            transform.setDragging(true);
        }
        e.preventDefault();
        e.cancelBubble = true;
    }
    function drag(e) {
        scaleOrigin = simpleDragZoom(e, scaleOrigin, transform);
        e.preventDefault();
        e.cancelBubble = true;
    }
    function stopDrag(e) {
        e.preventDefault();
        e.cancelBubble = true;
        if (typeof node.releaseCapture === 'function')
            node.releaseCapture();
        transform.setDragging(false);
        node.removeEventListener('mousemove', drag, true);
        window.removeEventListener('mouseup', stopDrag, true);
        scaleOrigin = null;
    }
    node.addEventListener('mousedown', startDrag, true);
    node.addEventListener('mouseup', stopDrag, true);
    node.addEventListener('wheel', rescaleWithWheel, true);
    return function () {
        node.removeEventListener('mousedown', startDrag, true);
        node.removeEventListener('mouseup', stopDrag, true);
        node.removeEventListener('wheel', rescaleWithWheel, true);
    };
}
var runningInBrowser = typeof window !== 'undefined';
var usePointerEvents = runningInBrowser && !!detect_pointer_events_1["default"].maxTouchPoints;
exports.panHandler = usePointerEvents ? withPointers : withMouse;

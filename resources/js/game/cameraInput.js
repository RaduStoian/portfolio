/**
 * Shared pointer state for camera gestures. Scenes decide whether an object
 * was hit first; only an empty-space press calls startPan().
 */
export function createCameraInput(camera) {
    let point = null;
    let arrowHeld = false;

    function pressOverlay(event) {
        const direction = camera.cameraArrowAtEvent(event);
        if (!direction) return false;
        camera.beginCameraArrow(direction);
        arrowHeld = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        return true;
    }

    function startPan(event) {
        point = { x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture?.(event.pointerId);
    }

    function move(event) {
        if (!point) return false;
        const dx = event.clientX - point.x;
        const dy = event.clientY - point.y;
        point = { x: event.clientX, y: event.clientY };
        camera.panCameraBy(dx, dy);
        return true;
    }

    function end() {
        point = null;
        if (arrowHeld) camera.endCameraArrow();
        arrowHeld = false;
    }

    function wheel(event) {
        if (camera.wheelCamera(event)) event.preventDefault();
    }

    return { pressOverlay, startPan, move, end, wheel };
}

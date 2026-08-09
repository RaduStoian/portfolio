import Matter from 'matter-js';

const { Bounds, Vector, Vertices } = Matter;

// Picking things up with a pointer.
//
// Matter's own `Query.point` is not usable for this: it tests bounding boxes
// only (`Query.region` under the hood), so clicking anywhere in a rotated
// sledgehammer's AABB "hits" it — including the large empty corners. The
// constraint then anchors at a point outside the shape and the hammer swings
// around thin air. Everything here exists to make the grab point land on the
// object you actually clicked, at the spot you actually clicked it.

/** A compound body's real shapes; `parts[0]` is the synthetic parent. */
function shapes(body) {
    return body.parts.length > 1 ? body.parts.slice(1) : body.parts;
}

/** Closest point to `point` on a convex polygon's outline. */
function closestOnPolygon(vertices, point) {
    let best = null;
    let bestDistance = Infinity;

    for (let i = 0; i < vertices.length; i++) {
        const a = vertices[i];
        const b = vertices[(i + 1) % vertices.length];
        const edge = Vector.sub(b, a);
        const lengthSq = Vector.magnitudeSquared(edge);
        // Clamped projection onto the segment, so the result is on the edge
        // itself rather than on its infinite line.
        const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, Vector.dot(Vector.sub(point, a), edge) / lengthSq));
        const projected = Vector.add(a, Vector.mult(edge, t));
        const distance = Vector.magnitudeSquared(Vector.sub(projected, point));

        if (distance < bestDistance) {
            bestDistance = distance;
            best = projected;
        }
    }

    return { point: best, distance: Math.sqrt(bestDistance) };
}

/**
 * Find what the pointer grabbed.
 *
 * Returns `{ body, point }` where `point` is guaranteed to lie on the body:
 * the click position when it's inside the shape, and the nearest point on the
 * surface when it's merely close. Grab a hammer by the end of its handle and
 * it hangs and swings from the end of its handle — which is the whole reason
 * this returns a point at all instead of just a body.
 *
 * `reach` is how far outside a shape a click still counts. A 3px handle is
 * unhittable without some slack, but the slack must never move the grab point
 * off the object.
 */
export function grabAt(bodies, point, reach = 6) {
    // Exact containment first: whatever the pointer is actually inside wins,
    // and later bodies win ties because they're drawn on top.
    for (let i = bodies.length - 1; i >= 0; i--) {
        const body = bodies[i];
        if (!Bounds.contains(body.bounds, point)) continue;
        for (const part of shapes(body)) {
            if (Vertices.contains(part.vertices, point)) {
                return { body, point: { x: point.x, y: point.y } };
            }
        }
    }

    // Otherwise the nearest surface within reach.
    let best = null;
    for (const body of bodies) {
        for (const part of shapes(body)) {
            const hit = closestOnPolygon(part.vertices, point);
            if (hit.distance < (best?.distance ?? Infinity)) best = { body, ...hit };
        }
    }

    return best && best.distance <= reach ? { body: best.body, point: best.point } : null;
}

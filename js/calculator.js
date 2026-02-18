const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export function timeToMinutes(timeString) {
    if (!timeString) return NaN;
    const parts = timeString.split(':');
    return Number(parts[0]) * 60 + Number(parts[1]);
}

export function polarToCartesian(bearingDeg, distance) {
    const rad = bearingDeg * DEG_TO_RAD;
    return {
        x: distance * Math.sin(rad),
        y: distance * Math.cos(rad)
    };
}

export function cartesianToPolar(x, y) {
    return {
        bearing: (Math.atan2(x, y) * RAD_TO_DEG + 360) % 360,
        distance: Math.sqrt(x * x + y * y)
    };
}

export function relativeMotion(pos1, pos2, deltaTimeHours) {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const displacement = Math.sqrt(dx * dx + dy * dy);
    return {
        course: (Math.atan2(dx, dy) * RAD_TO_DEG + 360) % 360,
        speed: displacement / deltaTimeHours,
        dx,
        dy
    };
}

export function closestPointOfApproach(pos1, dx, dy) {
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) {
        const distance = Math.sqrt(pos1.x * pos1.x + pos1.y * pos1.y);
        return { distance, point: { x: pos1.x, y: pos1.y }, t: 0 };
    }
    const t = -(pos1.x * dx + pos1.y * dy) / lengthSq;
    const point = {
        x: pos1.x + t * dx,
        y: pos1.y + t * dy
    };
    const distance = Math.sqrt(point.x * point.x + point.y * point.y);
    return { distance, point, t };
}

export function tcpaFromObservation(t, deltaTimeHours) {
    return (t - 1) * deltaTimeHours;
}

export function trueMotion(ownCourse, ownSpeed, relativeCourse, relativeSpeed) {
    const own = polarToCartesian(ownCourse, ownSpeed);
    const rel = polarToCartesian(relativeCourse, relativeSpeed);
    return cartesianToPolar(own.x + rel.x, own.y + rel.y);
}

export function computeResults(target, ownShip) {
    const pos1 = polarToCartesian(target.bearing1, target.distance1);
    const pos2 = polarToCartesian(target.bearing2, target.distance2);

    const t1 = timeToMinutes(target.time1);
    const t2 = timeToMinutes(target.time2);
    const deltaTime = (t2 - t1) / 60;

    if (isNaN(t1) || isNaN(t2) || deltaTime <= 0) return null;

    const relative = relativeMotion(pos1, pos2, deltaTime);
    const cpa = closestPointOfApproach(pos1, relative.dx, relative.dy);
    const tcpaHours = tcpaFromObservation(cpa.t, deltaTime);
    const trueTarget = trueMotion(ownShip.course, ownShip.speed, relative.course, relative.speed);

    return {
        pos1,
        pos2,
        relative,
        cpa: {
            distance: cpa.distance,
            point: cpa.point,
            tcpaMinutes: tcpaHours * 60
        },
        trueTarget: {
            course: trueTarget.bearing,
            speed: trueTarget.distance
        }
    };
}

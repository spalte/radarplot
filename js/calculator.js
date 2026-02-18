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

export function formatAspect(aspectDeg) {
    const a = ((aspectDeg % 360) + 360) % 360;
    const angle = a <= 180 ? a : 360 - a;
    const sideName = a <= 180 ? 'Tribord' : 'B\u00e2bord';
    const sidelight = a <= 180 ? `${sideName} (vert)` : `${sideName} (rouge)`;
    const sternlight = `${sideName} (blanc)`;

    if (angle < 2)               return "De l'avant - (rouge et vert)";
    if (angle < 22.5)            return `De l'avant - ${sidelight}`;
    if (angle < 67.5)            return `Sur l'avant du travers - ${sidelight}`;
    if (angle < 112.5)           return `Par le travers - ${sidelight}`;
    if (angle < 157.5)           return `Sur l'arri\u00e8re du travers - ${sternlight}`;
    if (angle < 178)             return `De l'arri\u00e8re - ${sternlight}`;
    return "De l'arri\u00e8re - (blanc)";
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
    const cpaBearing = cartesianToPolar(cpa.point.x, cpa.point.y).bearing;
    const bearingTargetToOwnAtP2 = (target.bearing2 + 180) % 360;
    const aspect = (bearingTargetToOwnAtP2 - trueTarget.bearing + 360) % 360;

    return {
        pos1,
        pos2,
        relative,
        cpa: {
            distance: cpa.distance,
            point: cpa.point,
            bearing: cpaBearing,
            tcpaMinutes: tcpaHours * 60
        },
        trueTarget: {
            course: trueTarget.bearing,
            speed: trueTarget.distance
        },
        aspect,
        aspectLabel: formatAspect(aspect),
        prediction: {
            x: pos2.x + relative.dx / deltaTime,
            y: pos2.y + relative.dy / deltaTime
        }
    };
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function milesBetween(a, b) {
  const earthRadiusMiles = 3958.7613;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(h));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function waveMessageAndStatus({ isTruckWorking, truckLocation, userLocation }) {
  if (isTruckWorking && truckLocation) {
    const distance = milesBetween(userLocation, truckLocation);
    if (distance > 5) {
      return {
        status: "away",
        message:
          "Looks like the truck may not be in your neighborhood today, but we saved your wave and will make sure we visit your neighborhood soon.",
      };
    }

    return {
      status: "pending",
      message: "Your Wave Has Been Sent To The Truck!\nListen For The Music!",
    };
  }

  return {
    status: "away",
    message:
      "Sorry we haven't hit the road yet but we save all our waves to ensure we get to your neighborhood soon.",
  };
}

module.exports = {
  normalizePhone,
  waveMessageAndStatus,
};

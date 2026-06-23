export const offices = Array.from({ length: 24 }, (_, i) => {
  const number = String(i + 1).padStart(3, "0");

  return {
    code: `A${number}`,
    location: "Business Bay, Dubai",
    price: 99,
    status: i === 3 || i === 8 ? "Rented" : "Available",
  };
});
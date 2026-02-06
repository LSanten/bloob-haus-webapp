export default {
  title: "Buff Baby Kitchen",
  description: "Home-cooked recipes from our kitchen",
  url: process.env.SITE_URL || "https://buffbaby.bloob.haus",
  author: "Leon",
  languageCode: "en-us",
  year: new Date().getFullYear(),
  permalinks: {
    slugify: true, // lowercase + hyphens for URLs
  },
};

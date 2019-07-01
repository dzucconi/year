module.exports = {
  files: {
    javascripts: {
      joinTo: {
        "vendor.js": /^(?!app)/,
        "app.js": /^app/
      }
    },
    stylesheets: {
      joinTo: "app.css"
    }
  },

  plugins: {
    babel: {
      presets: ["@babel/preset-env"]
    },
    postcss: {
      processors: [require("autoprefixer")(["last 8 versions"])]
    },
    digest: {
      pattern: /DIGEST\(\/?([^\)]*)\)/g,
      discardNonFilenamePatternParts: true,
      referenceFiles: /\.html$/,
      precision: 8,
      alwaysRun: false,
      environments: ["production"],
      prependHost: null,
      manifest: "",
      infixes: []
    }
  }
};

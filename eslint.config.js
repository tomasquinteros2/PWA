import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";
import refreshPlugin from "eslint-plugin-react-refresh";

export default tseslint.config(
    // Configuraciones globales
    {
      ignores: ["dist/", "node_modules/", "eslint.config.js", "vite.config.ts"],
    },

    // Configuración base de ESLint
    tseslint.configs.base,

    // Configuración para archivos TypeScript/JSX con chequeo de tipos
    {
      files: ["src/**/*.{ts,tsx}"],
      extends: [
        ...tseslint.configs.recommendedTypeChecked,
        ...tseslint.configs.stylisticTypeChecked,
      ],
      languageOptions: {
        parserOptions: {
          project: ['./tsconfig.app.json', './tsconfig.node.json'],
          tsconfigRootDir: import.meta.dirname,
        },
        globals: {
          ...globals.browser,
        },
      },
      plugins: {
        react: pluginReact,
        "react-hooks": hooksPlugin,
        "react-refresh": refreshPlugin,
      },
      rules: {
        // Reglas recomendadas de los plugins
        ...pluginReact.configs.recommended.rules,
        ...hooksPlugin.configs.recommended.rules,

        // Reglas personalizadas
        "react/react-in-jsx-scope": "off", // No necesario con el nuevo JSX transform
        "react/prop-types": "off", // TypeScript se encarga de esto
        "react-refresh/only-export-components": [
          "warn",
          { allowConstantExport: true },
        ],

        // Reglas de TypeScript que podrías querer ajustar
        "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
        "@typescript-eslint/no-explicit-any": "warn", // Advierte sobre el uso de 'any'
        "@typescript-eslint/no-misused-promises": [
          "error",
          {
            "checksVoidReturn": {
              "attributes": false
            }
          }
        ]
      },
      settings: {
        react: {
          version: "detect",
        },
      },
    },
);
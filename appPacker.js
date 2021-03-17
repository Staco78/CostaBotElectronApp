'use strict';
const packager = require('electron-packager');
const rimraf = require('rimraf');
const fs = require('fs');
const path = require('path');
const outDirectory = "pack";

rimraf(`./${outDirectory}/`, (error) => {
    if (error) {
        throw new Error(error);
    }
    else {
        packager({
            executableName: "CostaBot",
            'arch': 'x64',
            'platform': 'win32',
            'dir': './',
            'app-copyright': process.env.npm_package_author_name,
            'appVersion': process.env.npm_package_version,
            'asar': true,
            'icon': './static/assets/favicon.ico',
            'name': process.env.npm_package_name,
            'ignore': [
                /^\/.vscode/,
                /^\/node_modules/,
                /^\/src/,
                /^\/pack/,
                /^\/react-extension/,
                '.gitignore',
                'appPacker.js',
                'package-lock.json',
                'tsconfig.json',
                'webpack.config.js',
                'webpack.electron.js',
                'webpack.react.js',
                "test.js",
                "settings.json"
            ],
            'out': `./${outDirectory}`,
            'overwrite': true,
            'prune': true,
            'version-string': {
                'CompanyName': process.env.npm_package_author_name,
                'FileDescription': process.env.npm_package_description,
                'OriginalFilename': process.env.npm_package_name,
                'ProductName': process.env.npm_package_name,
                'InternalName': process.env.npm_package_name
            }
        }).then((appPath, error) => {
            if (error) {
                throw new Error(error);
            }
            else if (appPath) {
                console.log("Wrote new app at " + appPath.join("\n"));
            }
            console.log("App Packaged Successfully.");
        });
    }
});

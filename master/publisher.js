// publsiher

const { moduleName } = require("./index")
const fs = require('fs');
const shell = require('child_process').execSync;
const assetsModule = "assets/" + moduleName
const assetsFonts = "assets/fonts"

/* copy module */
if (fs.existsSync("./" + moduleName))
	shell("rm -r ./" + moduleName)
shell("cp -r ../mobile/modules/" + moduleName + " ./")

/* copy assets */
if (fs.existsSync("./assets"))
	shell("rm -r ./assets")
shell("mkdir -p assets")
if (fs.existsSync('../mobile/' + assetsModule + '/'))
	shell("cp -r ../mobile/" + assetsModule + "/ ./assets/")

/* copy fonts */
if (fs.existsSync("./fonts"))
	shell("rm -r ./fonts")
shell("mkdir -p fonts")
if (fs.existsSync('../mobile/' + assetsFonts + '/'))
	shell("cp -r ../mobile/" + assetsFonts + "/* ./fonts/")


/* copy lang */
if (fs.existsSync("../mobile/assets/locale/id.json")) {
	if (fs.existsSync("./id.json"))
		shell("rm ./id.json")
	shell("cp ../mobile/assets/locale/id.json .")
}

/* copy config */
if (fs.existsSync("../mobile/config.json")) {
	const confMobile = require("../mobile/config.json")
	if (confMobile.config.hasOwnProperty(moduleName)) {
		const confMaster = { [moduleName]: confMobile.config[moduleName] }
		fs.writeFileSync("./config.json", JSON.stringify(confMaster, undefined, 2))
	}
	/* copy config font */
	if (confMobile.config.hasOwnProperty("fonts")) {
		const config = require("./config.json")
		const confMaster = { ['fonts']: confMobile.config['fonts'] }
		fs.writeFileSync("./config.json", JSON.stringify(Object.assign(config, confMaster), undefined, 2))
	}

}

if (fs.existsSync("./package.json")) {
	const shell = require('child_process').execSync;
	const packJson = require("./package.json")
	const fs = require('fs');
	const version = packJson.version
	const vm = version.match(/([a-z])/g)
	const letter = vm ? vm[0] : null
	const number = version.replace(/-/g, "").replace(letter, "")
	let nextNumber = number.split(".")[2]
	let nextVersion = number.split(".")[0] + "." + number.split(".")[1] + "."

	nextNumber = Number(nextNumber) + 1
	nextVersion += nextNumber
	const newPackJson = { ...packJson, version: nextVersion }
	fs.writeFileSync("./package.json", JSON.stringify(newPackJson, undefined, 2))
	shell("npm publish", { stdio: ['inherit', 'inherit', 'inherit'] })
	console.log("\nbun add esoftplay-" + moduleName + "@" + nextVersion + "\n")
}
const fullVersion = `v${
	typeof __PKG_FULL_VERSION__ == "undefined" ? 1 : __PKG_FULL_VERSION__
}`;
const majorVersion = ` v${
	typeof __PKG_MAJOR_VERSION__ == "undefined" ? 1 : __PKG_MAJOR_VERSION__
}`;

module.exports = {
	fullVersion,
	majorVersion,
};

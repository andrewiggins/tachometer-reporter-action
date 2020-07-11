const VOID_ELEMENTS = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/;

/**
 * @param {string} tag
 * @param {object} attrs
 * @param  {...any} children
 */
function h(tag, attrs, ...children) {
	let attrStr = "";
	for (let key in attrs) {
		attrStr += ` ${key}="${attrs[key]}"`;
	}

	// @ts-ignore
	const childrenStr = children.flat(Infinity).join("");

	if (tag.match(VOID_ELEMENTS)) {
		return `<${tag}${attrStr} />`;
	} else {
		return `<${tag}${attrStr}>${childrenStr}</${tag}>`;
	}
}

module.exports = {
	h,
};

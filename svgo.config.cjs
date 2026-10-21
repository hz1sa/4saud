// إعداد svgo لملفات الشعار: نحافظ على viewBox حتى يتحجّم الشكل بلا تشوّه
module.exports = {
  multipass: true,
  floatPrecision: 1,
  plugins: [{ name: 'preset-default', params: { overrides: { removeViewBox: false } } }],
};

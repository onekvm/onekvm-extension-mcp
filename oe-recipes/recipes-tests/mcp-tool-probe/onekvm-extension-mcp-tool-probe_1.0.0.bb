SUMMARY = "Temporary MCP tool access acceptance fixture"
LICENSE = "GPL-3.0-only"
LIC_FILES_CHKSUM = "file://LICENSE;md5=1ebbd3e34237af26da5dc08a4e440464"
EXCLUDE_FROM_WORLD = "1"
FILESEXTRAPATHS:prepend := "${THISDIR}/../../../tests/fixtures/tool-probe:${THISDIR}/../../../:"
SRC_URI = "file://manifest.json.in file://probe.sh file://LICENSE"
S = "${UNPACKDIR}"
inherit onekvm-extension
ONEKVM_EXTENSION_ID = "mcp-tool-probe"
ONEKVM_EXTENSION_API_VERSION = "2"
ONEKVM_EXTENSION_MANIFEST_TEMPLATE = "${S}/manifest.json.in"
do_configure[noexec] = "1"
do_compile[noexec] = "1"
do_install() {
    install -d ${D}${ONEKVM_EXTENSION_ROOT}/bin
    install -m 0755 ${S}/probe.sh ${D}${ONEKVM_EXTENSION_ROOT}/bin/probe
    sed -e 's/@VERSION@/${PV}/g' -e 's/@ARCH@/${TARGET_ARCH}/g' ${S}/manifest.json.in > ${D}${ONEKVM_EXTENSION_ROOT}/manifest.json
}

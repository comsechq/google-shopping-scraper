const Apify = require('apify');
const { REQUEST_TYPES } = require('./consts');

function countryCodeToGoogleHostname(countryCode) {
    const suffix = countryCode.toLowerCase();
    switch (suffix) {
        case 'us':
            return 'www.google.com';
        default:
            return `www.google.${suffix}`;
    }
}

async function prepareRequestList(queries, countryCode) {
    const hostname = countryCodeToGoogleHostname(countryCode);
    const sources = queries
            .split('\n')
            .map(item => item.trim())
            .filter(item => !!item)
            .map((query) => {
                const url = `http://${hostname}/search?q=${encodeURIComponent(query)}&tbm=shop&tbs=vw:l`;

                return new Apify.Request({
                    url,
                    userData: {
                        type: REQUEST_TYPES.SEARCH_PAGE,
                        page: 1,
                        query,
                        hostname
                    }
                });
            });

    return await Apify.openRequestList('products', sources);
}

module.exports = {
    prepareRequestList,
};

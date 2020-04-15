const Apify = require('apify');
const url = require('url');
const { REQUEST_TYPES } = require('./consts');

const { log, sleep } = Apify.utils;
const { applyFunction } = require('./utils');

async function handleSearchPage(params, requestQueue, maxPagesPerQuery, isAdvancedResults, evaledFunc) {
    const { request, $ } = params;
    const { hostname, query } = request.userData;

    log.info(`Request URL   : ${request.url}`);
    log.info(`Request Data  : ${JSON.stringify(request.userData)}`);

    const parsedUrl = url.parse(request.url, true);

    const linkPrefix = `http://${hostname}`;

    const results = [];

    let resultElements = $('div[class$="list-result"]');

    log.info(`Processing "${query}" - found ${resultElements.length} products`);

    // check HTML if page has no results
    if (resultElements.length === 0) {
        log.warning('The page has no results. Check dataset for more info.');

        return {
            'noResults': true,
            // '#body': $('body').html(),
            '#html': $.html(),
            '#debug': Apify.utils.createRequestDebugInfo(request),
        };
    }

    // for each result element, grab data and push it to results array
    resultElements.each(function (index) {
        const result = $(this);

        const contentElement = result.find('div[class$="__content"]');
        const titleElement = contentElement.find('h3');
        const merchantNameElement = contentElement.find('a[class$="__merchant-name"]');
        const merchantMetricsElement = contentElement.find('a[href*="shopping/ratings/account/metrics?q="]');
        const reviewsElement = contentElement.find('a[href$="#reviews"]');
        const priceElement = contentElement.find('div > div > div > div > div > span > span[aria-hidden="true"]');
        const shoppingUrlElement = contentElement.find('a[href*="shopping/product/"]');

        let linkElement = contentElement.find('a[jsaction="spop.c"]');
        if (linkElement.length > 1) linkElement = $(linkElement.get(0));
        else linkElement = null;

        let productName = '';
        if (titleElement.length) productName = titleElement.text().trim();

        let price = '';
        if (priceElement.length) price = priceElement.text().trim();

        let description = '';

        let merchantName = '';
        let merchantLink = '';
        if (merchantNameElement.length) {
            merchantName = merchantNameElement.text().trim();
            merchantLink = `${linkPrefix}${merchantNameElement.attr('href')}`;
        }

        let merchantMetrics = '';
        if (merchantMetricsElement.length) merchantMetrics = merchantMetricsElement.text().trim();

        let reviewsLink = '';
        let reviewsScore = '';
        let reviewsCount = '';
        if (reviewsElement.length) {
            reviewsLink = `${linkPrefix}${reviewsElement.attr('href')}`;
            const scoreElement = reviewsElement.find('span div[aria-label]');
            if (scoreElement) reviewsScore = scoreElement.attr('aria-label').trim();
            const countElement = reviewsElement.find('span[aria-label]');
            if (countElement) reviewsCount = countElement.text().trim();
        }

        const link = `${linkPrefix}${linkElement.prop('href')}`;

        let shoppingId = '';
        let shoppingUrl = '';
        if (shoppingUrlElement.length) {
            const firstShoppingUrlElement = $(shoppingUrlElement.get(0));
            shoppingUrl = firstShoppingUrlElement.attr('href').split('?').shift();
            shoppingId = shoppingUrl.split('/').pop();
            shoppingUrl = `${linkPrefix}${shoppingUrl}`;
        }

        const output = {
            query,
            productName,
            productLink: link,
            price,
            description,
            merchantName,
            merchantMetrics,
            merchantLink,
            shoppingId,
            shoppingUrl,
            reviewsLink,
            reviewsScore,
            reviewsCount,
            positionOnSearchPage: index + 1,
            productDetails: null,
        };

        results.push(output);
    });

    const searchResults = [];

    // for each result, enqueue product page
    for (let i = 0; i < results.length; i++) {
        let result = results[i];

        // If result does not contain shopping ID, then we cannot load product detail page, so directly output the item
        if (!result.shoppingId) {
            // if basic results, re-initialize result object with relevant props
            if (!isAdvancedResults) {
                result = {
                    shoppingId: result.shoppingId,
                    productName: result.productName,
                    description: result.description,
                    merchantMetrics: result.merchantMetrics,
                    seller: null,
                    price: result.price,
                    merchantLink: result.merchantLink
                }
            }

            // if extended output fnction exists, apply it now.
            if (evaledFunc) result = await applyFunction($, evaledFunc, result);

            searchResults.push({
                status: 200,
                result: result
            });

            continue; // eslint-disable-line
        }

        await requestQueue.addRequest({
            url: result.shoppingUrl,
            userData: {
                ...request.userData,
                type: REQUEST_TYPES.PRODUCT_PAGE,
                result,
            },
        });
    }

    // slow down scraping to avoid being blocked by google
    await sleep(1000);

    let nextPageUrl = $('a#pnnext').attr('href');
    let currentPage = request.userData.page;

    if (nextPageUrl) {
        if (currentPage < maxPagesPerQuery && maxPagesPerQuery) {

            request.userData.page++;

            const url = `${linkPrefix}${nextPageUrl}`
            
            await requestQueue.addRequest({
                url: url,
                userData: request.userData
            });

        } else {
            log.info(`Not enqueueing next page for query "${parsedUrl.query.q}" because the "maxPagesPerQuery" limit has been reached.`);
        }
    } else {
        log.info(`This is the last page for query "${parsedUrl.query.q}". Next page button has not been found.`);
    }

    // Log some nice info for user.
    log.info(`Finished query "${parsedUrl.query.q}" page ${currentPage}`);

    return searchResults;
}

module.exports = {
    handleSearchPage,
};

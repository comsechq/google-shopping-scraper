const Apify = require('apify');
const rp = require('./rp-wrapper.js');

const { log } = Apify.utils;
const { checkAndEval } = require('./utils');

const { REQUEST_TYPES } = require('./consts');
const { prepareRequestList } = require('./requestList');
const { handleSearchPage } = require('./search_page');
const { handleProductPage } = require('./product_page');

Apify.main(async () => {
    const input = await Apify.getValue('INPUT');

    // Validate the input
    if (!input) throw new Error('Missing configuration');

    let {
        queries,
        countryCode,
        resultsPerPage,
        maxPagesPerQuery,
        isAdvancedResults,
        saveHtml, 
        saveHtmlToKeyValueStore,
        extendOutputFunction = null,
    } = input;

    if (!queries || !queries.length || !countryCode) {
        throw new Error('Missing configuration');
    }

    resultsPerPage = resultsPerPage || 20;

    // Prepare the initial list of google shopping queries and request queue
    const requestList = await prepareRequestList(queries, countryCode, resultsPerPage);
    if (!requestList.length) throw new Error('The input must contain at least one search query or URL.');

    const requestQueue = await Apify.openRequestQueue();
    const dataset = await Apify.openDataset();
    const keyValueStore = await Apify.openKeyValueStore();

    // if exists, evaluate extendOutputFunction
    let evaledFunc;
    if (extendOutputFunction) evaledFunc = checkAndEval(extendOutputFunction);

    // Configure the crawler
    const crawler = new Apify.CheerioCrawler({
        requestList,
        requestQueue,
        useApifyProxy: true,
        apifyProxyGroups: ['GOOGLE_SERP'],
        handlePageTimeoutSecs: 60,
        requestTimeoutSecs: 180,
        handlePageFunction: async (params) => {
            const { request, body } = params;
            const data = request.userData.type === REQUEST_TYPES.SEARCH_PAGE ?
                            await handleSearchPage(params, requestQueue, resultsPerPage, maxPagesPerQuery, isAdvancedResults, evaledFunc) :
                            await handleProductPage(params, isAdvancedResults, evaledFunc);

            if (saveHtml) {
                data.html = body;
            }

            if (saveHtmlToKeyValueStore) {
                const key = `${request.userData.type}-${request.id}.html`;
                await keyValueStore.setValue(key, body, { contentType: 'text/html; charset=utf-8' });
                data.htmlSnapshotUrl = keyValueStore.getPublicUrl(key);
            }

            await dataset.pushData(data);
        },
        handleFailedRequestFunction: async ({ request, error }) => {
            log.warning(`Request ${request.url} failed too many times`);
            log.warning(error);
        }
    });

    // Process the queries
    await crawler.run();

    // Log the finish message, so that the user sees that the scraping is finished
    log.info('Processed all items');

    const { datasetId } = dataset;
    
    if (datasetId) {
        log.info(`Scraping is finished, see you next time.
Full results in JSON format:
https://api.apify.com/v2/datasets/${datasetId}/items?format=json`);
    } else {
        log.info('Scraping is finished, see you next time.');
    }

    if(input.webhook) {

        // Push the result to API Gateway which will call the Lambda and put the results in S3.
        log.info('Pushing results to the webhook.');

        const datasetData = {
            'datasetId': datasetId,
            'data': input.webhook.finishWebhookData
        };

        const maxRetries = 3;

        for (let retry = 0; retry < maxRetries; retry++) {
            try {

                const out = await rp.rp({
                    url: input.webhook.url,
                    method: input.webhook.method,
                    json: datasetData,
                    headers: input.webhook.headers
                });

                console.log(out);
                break;

            } catch (e) {
                console.log(e);
            }
        };
    }
});

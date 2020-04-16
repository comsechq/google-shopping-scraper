const Apify = require('apify');

function getSellers(productElement, $, linkPrefix) {

    // get all sellers
    const sellerRows = productElement.find('#sh-osd__online-sellers-cont .sh-osd__offer-row');
    const results = [];

    // For each seller, get data and push it to results array
    sellerRows.each(function () {
        const row = $(this);

        const price = row.find('td:nth-child(3)').text().trim();
        const additionalPrice = row.find('.sh-osd__content table tbody tr:nth-child(2) td:first-child').text().trim();

        let totalPrice = row.find('.sh-osd__total-price').text().trim();
        if (!totalPrice) totalPrice = price;

        let url = row.find('.sh-osd__seller-link').prop('href');

        if (!url.startsWith('http')) {
            url = `${linkPrefix}${url}`;
        }

        results.push({
            productLink: url,
            merchantName: row.find('.sh-osd__seller-link span:first-child').text().trim(),
            price,
            totalPrice,
            additionalPrice,
        });
    });

    // return results array
    return results;
}


async function handleProductPage({ request, $ }) {
    const { hostname } = request.userData;
    let { result } = request.userData;

    const linkPrefix = `http://${hostname}`;

    const productElement = $('div[class^="sg-product"]');

    // Page does not contain product details end here
    if (!productElement.length) {

        return {
            status: 200,
            result: result
        };
    }

    // grab description
    const descriptionSpan = productElement.find('p.sh-ds__desc span[style="display:none"]');

    if (descriptionSpan) {
        const desc = descriptionSpan.text();
        result.description = desc.replace('« less', '');
    }

    // get sellers data and add it to productDetails
    const sellers = getSellers(productElement, $, linkPrefix);

    const productResults = [];

    sellers.forEach(sellerEntry => {

        let seller = sellerEntry;
        
        seller.productName = result.productName;
        seller.description = result.description;
        seller.merchantName = result.merchantName;
        seller.shoppingId = result.shoppingId;
        seller.shoppingUrl = result.shoppingUrl;
        seller.positionOnSearchPage = result.positionOnSearchPage;

        productResults.push({
            status: 200,
            result: seller
        });
    });

    // slow down scraping to avoid being blocked by google
    await Apify.utils.sleep(1000);

    return productResults;
}

module.exports = {
    handleProductPage,
};

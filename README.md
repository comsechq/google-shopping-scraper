# Google Shopping Scraper
Google Shopping Scraper is an [Apify actor](https://apify.com/actors) for extracting data from [Google Shopping](https://www.google.com/shopping) web site, in any country domain. It scrapes the first result page and details about each product and its sellers. It is build on top of [Apify SDK](https://sdk.apify.com/) and you can run it both on [Apify platform](https://my.apify.com) and locally.

- [Input](#input)
- [Output](#output)
- [Google SERP](#google-serp)
- [Expected CU consumption](#expected-cu-consumption)
- [Open an issue](#open-an-issue)

### Input

| Field | Type | Description |
| ----- | ---- | ----------- |
| queries | Array of Strings | (required) List of queries to search for |
| countryCode | String | (required) Provide the country to search in (choose from the country list when using the editor, provide the country code when using JSON) |
| resultsPerPage | Integer | Number of results to get per page.
| maxPagesPerQuery | Integer | Number of pages of results to scrape.

INPUT Example:

```
{
  "queries": [
    "iphone 11 pro"
  ],
  "countryCode": "US",
  "resultsPerPage": 100,
  "maxPagesPerQuery": 1
}
```

### Output

Output is stored in a dataset.
Example of one output item:
```
{
  "shoppingId": "7427975830799030963",
  "productName": "24k Gold Plated Apple Iphone 11 Pro Max - 256 Gb Silver Unlocked Cdma",
  "description": "Shoot amazing videos and photos with the Ultra Wide, Wide, and Telephoto cameras. Capture your best low-light photos with Night mode. Watch HDR movies and shows on the 6.5-inch Super Retina XDR display the brightest iPhone display yet. Experience unprecedented performance with A13 Bionic for gaming, augmented reality (AR), and photography. And get all-day battery life and a new level of water resistance. All in the first iPhone powerful enough to be called Pro.« less",
  "merchantMetrics": "",
  "seller": [
    {
      "productLink": "http://www.google.com/aclk?sa=L&ai=DChcSEwiT8NStooPoAhUJjrMKHf6KDlkYABABGgJxbg&sig=AOD64_2y1iAG2xTUTL-jllVQRjqJyIg9rw&adurl=&ctype=5",
      "merchant": "eBay",
      "merchantMetrics": "0",
      "details": "· Free shipping",
      "price": "$1,650.00",
      "totalPrice": "$1,796.44",
      "additionalPrice": ""
    }
  ],
  "price": "$1,979.10",
  "merchantLink": "http://www.google.com/aclk?sa=l&ai=DChcSEwjp_vSpooPoAhUMlLMKHR6ODhsYABBGGgJxbg&sig=AOD64_3BSHnJWpFXjeoJyysFuEev97t7Ew&ctype=5&q=&ved=0ahUKEwjFo_GpooPoAhV0mHIEHfKkDGAQg-UECOIG&adurl="
}
```

*Note about price format*
- Different countries has different price formats, currently the actor leaves the price format as it is found on the page.

### Google SERP
The actor uses Google SERP Proxy to scrape localized results. For more information, check the [documentation](https://docs.apify.com/proxy/google-serp-proxy).

### Expected CU consumption
Expected compute units is 0.0272 every 10 products.

### Open an issue
If you find any bug, please create an issue on the actor [Github page](https://github.com/emastra/google-shopping-scraper).

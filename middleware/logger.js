function logger(req, res, next) {
    // Capture the exact date and time the request arrived
    const timestamp = new Date().toLocaleString();

    const startTime = Date.now();

    // Listen for the response to finish so we can get the actual status code
    res.on('finish', () => {
        // Calculate how long it took
        const duration = Date.now() - startTime;

        // Print the required core info (Method, URL, Date/Time, Status)
        console.log(`[${timestamp}] ${req.method} ${req.url} - Status: ${res.statusCode}`);

        // Print useful info
        console.log(`Duration: ${duration}ms`);
        console.log(`Query Params:`, req.params);
        console.log(`Body:`, req.body);
        //console.log(`Headers:`, req.headers);
        console.log('--------------------------------------------------');
    });

    next(); // pass control to the next middleware/route
}

module.exports = logger;
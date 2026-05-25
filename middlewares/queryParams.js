// middlewares/queryParams.js
const queryHandler = (req, res, next) => {
    try {
        const { search = '', sort = 'newest', page = 1, limit = 9 } = req.query;

        req.queryParams = {
            search: search.trim(),
            sort,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 9
        };
        next();
    } catch (err) {
        req.queryParams = { search: '', sort: 'newest', page: 1, limit: 9 };
        next();
    }
};

module.exports = { queryHandler };

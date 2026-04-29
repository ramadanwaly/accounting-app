const parsePagination = (query) => {
    const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
    const requestedLimit = Number.parseInt(query.limit, 10) || 50;
    const limit = Math.min(Math.max(requestedLimit, 1), 200);
    return {
        page,
        limit,
        offset: (page - 1) * limit
    };
};

const hasListFilters = (query) => {
    return Boolean(query.page || query.limit || query.startDate || query.endDate || query.search || query.project || query.category);
};

module.exports = {
    parsePagination,
    hasListFilters
};

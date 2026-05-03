const parsePagination = (query) => {
    const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
    // إذا كان هناك بحث أو فلترة، نستخدم حد كبير جداً افتراضياً لعرض كل البيانات
    const isFiltered = Boolean(query.startDate || query.endDate || query.search || query.project || query.category);
    const defaultLimit = isFiltered ? 100 : 50;
    
    const requestedLimit = Number.parseInt(query.limit, 10) || defaultLimit;
    const limit = Math.min(Math.max(requestedLimit, 1), 500);
    
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

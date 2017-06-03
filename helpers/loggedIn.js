module.exports = function loggedIn(req, res, next) {
    if (req.user) {
        next();
    } else {
        if (req.xhr) {
            res.sendStatus(401);
        } else {
            next();
        }
    }
};

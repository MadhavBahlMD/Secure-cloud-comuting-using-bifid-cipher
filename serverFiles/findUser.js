const {mongoose} = require('./mongoose');
const {User} = require('./userSchema');

const existingUser = (user, callback) => {
    console.log('Checking for the user');
    console.log('Req.body is: ', user.email);
    User.findOne({email: user.email}, (err, result) => {
        if (err) {
            callback(err);
        } else {
            if (result) {
                console.log('Found the user!', result);
                callback(undefined, result);
            } else {
                callback(undefined, undefined);
            }
        }
    });
};

module.exports = {existingUser}

let users = require('./usersData.json');

function getUsers() {  // return the users list from the mock database
    return users;
}

module.exports = getUsers;
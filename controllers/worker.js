/*
get id and encrypted password from credentials db
    Check timestamp
    if < 8 days
        unencrypt password
        make calls and store metrics
            store using user id and app name
    else
        Move all records to archive db
*/

// IDEA: Delete Librato token after 10 days
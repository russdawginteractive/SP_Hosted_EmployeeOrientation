'use strict';
var clientContext;
var employeeList;
var completedItems;
var notStartedItems;
var calendarList;
var scheduledItems;
var hostWebURL;

(function () {
    hostWebURL = decodeURIComponent(getQueryStringParameter("SPHostUrl"));
    
})();

var clientContext = SP.ClientContext.get_current();
var employeeList = clientContext.get_web().get_lists().getByTitle('New Employees In Seattle');

function purgeCompletedItems() {
   
    var camlQuery = new SP.CamlQuery();
    camlQuery.set_viewXml(
        '<View><Query><Where><Eq>' +
        '<FieldRef Name=\'OrientationStage\'/><Value Type=\'Choice\'>Completed</Value>' +
        '</Eq></Where></Query></View>');
    completedItems = employeeList.getItems(camlQuery);
    clientContext.load(completedItems);

    clientContext.executeQueryAsync(deleteCompletedItems, onGetCompletedItemsFail);
    return false;
}

function deleteCompletedItems() {

    var itemArray = new Array();
    var listItemEnumerator = completedItems.getEnumerator();

    while (listItemEnumerator.moveNext()) {
        var item = listItemEnumerator.get_current();
        itemArray.push(item);
    }

    var i;
    for (i = 0; i < itemArray.length; i++) {
        employeeList.getItemById(itemArray[i].get_id()).deleteObject();
    }

    clientContext.executeQueryAsync(onDeleteCompletedItemsSuccess, onDeleteCompletedItemsFail);
}

function onDeleteCompletedItemsSuccess(sender, args) {
    alert('Completed orientations deleted.');
    location.reload(true);
}

// Failure callbacks

function onGetCompletedItemsFail(sender, args) {
    alert('Unable to get completed items. Error:' + args.get_message() + '\n' + args.get_stackTrace());
}

function onDeleteCompletedItemsFail(sender, args) {
    alert('Unable to delete completed items. Error:' + args.get_message() + '\n' + args.get_stackTrace());
}


function ensureOrientationScheduling() {

    var camlQuery = new SP.CamlQuery();
    camlQuery.set_viewXml(
        '<View><Query><Where><Eq>' +
        '<FieldRef Name=\'OrientationStage\'/><Value Type=\'Choice\'>Not started</Value>' +
        '</Eq></Where></Query></View>');
    notStartedItems = employeeList.getItems(camlQuery);

    clientContext.load(notStartedItems);
    clientContext.executeQueryAsync(getScheduledOrientations, onGetNotStartedItemsFail);
    return false;
}

function getScheduledOrientations() {

    var hostWebContext = new SP.AppContextSite(clientContext, hostWebURL);
    calendarList = hostWebContext.get_web().get_lists().getByTitle('Employee Orientation Schedule');

    var camlQuery = new SP.CamlQuery();
    scheduledItems = calendarList.getItems(camlQuery);

    clientContext.load(scheduledItems);
    clientContext.executeQueryAsync(scheduleAsNeeded, onGetScheduledItemsFail);
}

function scheduleAsNeeded() {

    var unscheduledItems = false;
    var dayOfMonth = '19';

    var listItemEnumerator = notStartedItems.getEnumerator();

    while (listItemEnumerator.moveNext()) {
        var alreadyScheduled = false;
        var notStartedItem = listItemEnumerator.get_current();

        var calendarEventEnumerator = scheduledItems.getEnumerator();
        while (calendarEventEnumerator.moveNext()) {
            var scheduledEvent = calendarEventEnumerator.get_current();

            // The SP.ListItem.get_item('field_name ') method gets the value of the specified field.
            if (scheduledEvent.get_item('Title').indexOf(notStartedItem.get_item('Title')) > -1) {
                alreadyScheduled = true;
                break;
            }
        }
        if (alreadyScheduled === false) {

            // SP.ListItemCreationInformation holds the information the SharePoint server needs to
            // create a list item
            var calendarItem = new SP.ListItemCreationInformation();

            // The some_list .additem method tells the server which list to add 
            // the item to.
            var itemToCreate = calendarList.addItem(calendarItem);

            // The some_item .set_item method sets the value of the specified field.
            itemToCreate.set_item('Title', 'Orient ' + notStartedItem.get_item('Title'));

            // The EventDate and EndDate are the start and stop times of an event.
            itemToCreate.set_item('EventDate', '2017-06-' + dayOfMonth + 'T14:00:00Z');
            itemToCreate.set_item('EndDate', '2017-06-' + dayOfMonth + 'T16:00:00Z');
            dayOfMonth++;

            // The update method tells the server to commit the changes to the SharePoint database.
            itemToCreate.update();
            unscheduledItems = true;
        }
    }
    if (unscheduledItems) {
        calendarList.update();
        clientContext.executeQueryAsync(onScheduleItemsSuccess, onScheduleItemsFail);
    }
}

function onScheduleItemsSuccess() {
    alert('There was one or more unscheduled orientations and they have been added to the '
        + 'Employee Orientation Schedule calendar.');
}

function onGetNotStartedItemsFail(sender, args) {
    alert('Unable to get the not-started items. Error:'
        + args.get_message() + '\n' + args.get_stackTrace());
}

function onGetScheduledItemsFail(sender, args) {
    alert('Unable to get scheduled items from host web. Error:'
        + args.get_message() + '\n' + args.get_stackTrace());
}

function onScheduleItemsFail(sender, args) {
    alert('Unable to schedule items on host web calendar. Error:'
        + args.get_message() + '\n' + args.get_stackTrace());
}
// Function to retrieve a query string value.
function getQueryStringParameter(paramToRetrieve) {
    var params = document.URL.split("?")[1].split("&");
    for (var i = 0; i < params.length; i = i + 1) {
        var singleParam = params[i].split("=");
        if (singleParam[0] === paramToRetrieve) {
            return singleParam[1];
        }
    }
}
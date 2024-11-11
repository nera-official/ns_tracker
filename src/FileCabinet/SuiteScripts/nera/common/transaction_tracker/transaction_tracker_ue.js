/**
 * =========================================================================================================
 * Tracker - User Event Script
 * =========================================================================================================
 * 
 * Purpose:
 * - Provide an 1-1 tracking custom record (fields: custom status, memo)
 * - Example use case is a period-locked transaction can use this feature to record a custom tracker
 * 
 * Deployment:
 * - Deploy this script Any transaction record types that require tracking 
 * 
 * Script Info:
 * @name transaction_tracker_ue
 * @link transaction_tracker_cs.js, customrecord_nera_transaction_tracker
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @author Min Myat Oo <minmyatoo@nera.net>
 * @copyright Copyright (c) 2024 NERA Telecommunications
 * 
 * =========================================================================================================
 */

define(["N/log", "N/query", "N/record", 'N/ui/message'], function( log, query, record,  msg) {

    /*********************************
     * CONSTANTS
     *********************************/
    const CLIENT_SCRIPT_PATH = './transaction_tracker_cs.js';

    const CONSTANTS = {
        RECORDS: {
            TRANSACTION_TRACKER: "customrecord_nera_transaction_tracker",
        },
        DEFAULT_TRACKER_STATUS: 5, // DO: Created, Pending Delivery (Tracker Status)
        TRACKER_FIELDS: {
            LINKED_TRANSACTION: "custrecord_tt_linked_transaction",
            RECORD_TYPES: "custrecord_tt_record_types",
            TRACKER_STATUS: "custrecord_tt_tracker_status",
            MEMO: "custrecord_tt_memo",
        },
        ROLES: {
            SYSTEM_ADMIN: "3",
        },
        UI: {
            BUTTON_LABEL: "Update Tracker Status"
        },
    };
  
    /*********************************
     * ENTRY POINT FUNCTIONS
     *********************************/

    function beforeLoad(context) {

        const { newRecord, type, UserEventType, form } = context;

        // Qualify: This Is Not A New Record
        if (type === UserEventType.CREATE) {
            return;
        }

        // Qualify: No permission issue retrieving trackers custom record
        const trackers = getRelatedTrackers(newRecord.type, newRecord.id); // get all related trackers for this transaction
        if (trackers==null) {
            return;
        }
        
        // Create "Update Tracker" Button
        form.addButton({
            id: "custpage_do_action",
            label: CONSTANTS.UI.BUTTON_LABEL,
            functionName: `updateTrackerStatus('${newRecord.recordType}', '${newRecord.recordId}')`,
        });

        // Create Tracker Info Fields
        const mostRecentTracker = trackers[0]; 
        if (mostRecentTracker?.trackerStatus) {
            addTrackerFields(context, mostRecentTracker);
        }

        // Inject Client Script
        form.clientScriptModulePath = CLIENT_SCRIPT_PATH;

    } 
    
    // By default, we want to create a new Tracker record for every new record
    function afterSubmit(context) {
        const { newRecord, type, UserEventType } = context;

        // Qualify: Only For New Record
        if (type == UserEventType.CREATE) {
    
            const trackers = getRelatedTrackers(newRecord.type, newRecord.id); // get all related trackers for this transaction

            // No related trackers found, create one
            if (trackers!=null && trackers.length==0) {
                createTracker(
                    newRecord.type,
                    newRecord.id,
                    CONSTANTS.DEFAULT_TRACKER_STATUS
                );
            }
        }
    };

    
    /*********************************
     * SEARCH FUNCTIONS
     *********************************/

    // Return Result of SuiteQL
    function querySuiteQL(sql) {
        return query.runSuiteQL({query: sql}).asMappedResults();
    }

    // Retrive list of Tracker records related to this transaction
    function getRelatedTrackers(recordType, recordId) {
        try {

            const sql = `
            select
                id as internalid,
                custrecord_tt_memo as memo,
                custrecord_tt_tracker_status as trackerStatus
            from
                customrecord_nera_transaction_tracker
            where 
                custrecord_tt_record_types = '${recordType}' and
                custrecord_tt_internalid = ${recordId}
            order by id desc
            `;
            // log.debug({
            //     title: "getRelatedTrackers",
            //     details: `${sql}`
            // });
            return querySuiteQL(sql);

        } catch (error) {

            // User has no permission to this custom record, SuiteQL will fail with permission error
            // this could be intentional, but this feature will not proceed for this record

            // Log error, so that we can track which roles having this permisison issue
            log.error({
                title: "getRelatedTrackers",
                details: `${error.message}`
            });

            // inform the user
            msg.create({
                title: "Transaction Tracker",
                message: "You don't have permission to View Transaction Tracker",
                type: msg.Type.INFORMATION
            }).show({
                duration: 10000 // Duration in milliseconds (10 seconds)
            });
            
            // null indicates error on SuiteQL
            return null; 
        }
    };

  
    /*********************************
     * FORM MODIFICATION FUNCTIONS
     *********************************/

    function addTrackerFields(context, trackerInfo) {
        const { form } = context;
        const { trackerStatus, memo = "" } = trackerInfo;
    
        const fields = [
            {
            id: "custpage_tracker_status",
            label: "Tracker Status",
            value: trackerStatus,
            },
            {
            id: "custpage_tracker_memo",
            label: "Tracker Memo",
            value: memo,
            },
        ];
    
        fields.forEach(({ id, label, value }) => {
            const field = form.addField({
                id,
                label,
                type: "text",
                container: "main",
            });
    
            form.insertField({
                field,
                nextfield: "custbody_nera_notes",
            });
    
            field.defaultValue = value;
        });
    };
  
    /*********************************
     * RECORD MANAGEMENT FUNCTIONS
     *********************************/
  
    // Create A New Tracker Record
    function createTracker(recordType, recordId, trackerStatus, memo) {
        try {

            // create a tracker record in memory
            const trackerRecord = record.create({
                type: CONSTANTS.RECORDS.TRANSACTION_TRACKER,
            });
    
            // configure the values of the tracker
            const fields = {
                [CONSTANTS.TRACKER_FIELDS.RECORD_TYPES]: recordType,
                [CONSTANTS.TRACKER_FIELDS.LINKED_TRANSACTION]: recordId,
                [CONSTANTS.TRACKER_FIELDS.TRACKER_STATUS]: trackerStatus,
                [CONSTANTS.TRACKER_FIELDS.MEMO]: memo
            };
    
            // update the values of tracker
            Object.entries(fields).forEach(([fieldId, value]) => {
                trackerRecord.setValue({ fieldId, value });
            });
    
            // save the tracker to database
            return trackerRecord.save(); // return the new internal ID of tracker record

        } catch (error) {

            // Permission error will cause the tracker creation failure
            // log error so that we can track which role is missing this permission
            log.error({ title: "createTracker", details: error.message });

            // inform the user
            msg.create({
                title: "Transaction Tracker",
                message: "You don't have permission to Create Transaction Tracker",
                type: msg.Type.INFORMATION
            }).show({
                duration: 10000 // Duration in milliseconds (10 seconds)
            });
            
            // null indicates error
            return null;  
        }
    };
  
    return { 
        beforeLoad, 
        afterSubmit 
    };

});
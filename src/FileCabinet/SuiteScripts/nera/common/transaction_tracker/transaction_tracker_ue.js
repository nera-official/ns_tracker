/**
 * =========================================================================================================
 * Transaction Tracker - User Event Script
 * =========================================================================================================
 * 
 * Purpose:
 * - Provide an 1-1 tracking custom record (fields: status, memo)
 * - Example use case is a period-locked transaction can use this feature to record a custom tracker
 * 
 * Deployment:
 * - Deploy this script Any transaction types that require tracking with custom status and memo field 
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

define(["N/log", "N/query", "N/record", 'N/ui/message', 'N/ui/serverWidget'], function(log, query, record,  msg, serverWidget) {

    /*********************************
     * CONSTANTS
     *********************************/
    const CLIENT_SCRIPT_PATH = './transaction_tracker_cs.js';

    const TRACKER_RECORD_TYPE = "customrecord_nera_transaction_tracker";
    const DEFAULT_TRACKER_STATUS = 5; // DO: Created, Pending Delivery (Tracker Status)
    const TRACKER_RECORD_FIELDS = {
        LINKED_TRANSACTION: "custrecord_tt_linked_transaction",
        RECORD_TYPE: "custrecord_tt_record_types",
        STATUS: "custrecord_tt_tracker_status",
        MEMO: "custrecord_tt_memo",
    };
    const UI = {
        UPDATE_TRACKER_BUTTON_ID: 'custpage_do_action',
        UPDATE_TRACKER_BUTTON_LABEL: "Update Tracker Status",
        TRACKER_FIELD_GROUP_ID: 'custpage_tracker_fieldgroup',
        TRACKER_FIELD_GROUP_LABEL: "Transaction Tracker",
        TRACKER_STATUS_NAME_ID: 'custpage_tracker_status',
        TRACKER_STATUS_NAME_LABEL: 'Status',
        TRACKER_MEMO_ID: 'custpage_tracker_memo',
        TRACKER_MEMO_LABEL: 'Memo',
        TRACKER_UPDATED_BY_ID: 'custpage_tracker_updatedby',
        TRACKER_UPDATED_BY_LABEL: 'Updated By',
        TRACKER_UPDATED_ON_ID: 'custpage_tracker_updatedon',
        TRACKER_UPDATED_ON_LABEL: 'Updated On',
        TRACKER_STATUS_ID: 'custpage_trakcer_status_id',
        TRACKER_STATUS_LABEL: 'Status Internal ID',
        TRACKER_INTERNAL_ID: 'custpage_tracker_internal_id',
        TRACKER_INTERNAL_ID_LABEL: 'Tracker Internal ID'
    };
    
    /*********************************
     * ENTRY POINT FUNCTIONS
     *********************************/

    // Load Tracker Record and Render Page UI
    function beforeLoad(context) {

        const { newRecord, type, UserEventType, form } = context;
        
        // Add Button To Page: "Update Tracker"
        // support form in any mode: VIEW, CREATE, EDIT
        form.addButton({
            id: UI.UPDATE_TRACKER_BUTTON_ID,
            label: UI.UPDATE_TRACKER_BUTTON_LABEL,
            functionName: `showTrackerPopup('${newRecord.recordType}', '${newRecord.recordId}')`,
        });
        
        // Create The Tracker Fields, and load the values if applicable
        updateForm(context);

        // Inject Client Script - this will populate the tracker values
        form.clientScriptModulePath = CLIENT_SCRIPT_PATH;
    } 
    
    // Save Tracker Record If Changed, Create one if not exist
    function afterSubmit(context) {
        const { newRecord, oldRecord, type, UserEventType } = context;

        const tracker_internal_id = newRecord.getValue({ fieldId: UI.TRACKER_INTERNAL_ID });
        const status_id_new = newRecord.getValue({ fieldId: UI.TRACKER_STATUS_ID });
        const status_id_old = oldRecord?.getValue({ fieldId: UI.TRACKER_STATUS_ID });
        const memo_new = newRecord.getValue({ fieldId: UI.TRACKER_MEMO_ID });
        const memo_old = oldRecord?.getValue({ fieldId: UI.TRACKER_MEMO_ID });

        // User had updated the tracker info, either status_id or memo has been updated
        if ((status_id_old!=status_id_new) || (memo_old!=memo_new)) {

            // Existing Transaction, existed Tracker Internal ID
            if (tracker_internal_id) 
                updateTrackerRecord(tracker_internal_id, status_id_new, memo_new)

            // New Transaction, create the tracker record
            else if (type==UserEventType.CREATE)
                createTrackerRecord(
                    newRecord.type,
                    newRecord.id,
                    status_id_new || DEFAULT_TRACKER_STATUS,
                    memo_new
                );
        }
    }

    /*********************************
     * UI OPERATION
     *********************************/
    
    // Update Form With Tracker Info
    function updateForm(context) {

        const { newRecord, type, UserEventType, form } = context;
        
        // Create Field Group First
        form.addFieldGroup({
            id: UI.TRACKER_FIELD_GROUP_ID,
            label: UI.TRACKER_FIELD_GROUP_LABEL
        });
        
        // Create The Empty Fields
        const status_name_field = form.addField({
            id: UI.TRACKER_STATUS_NAME_ID, 
            label: UI.TRACKER_STATUS_NAME_LABEL, 
            type: serverWidget.FieldType.TEXT,
            container: UI.TRACKER_FIELD_GROUP_ID
        });

        const memo_field = form.addField({
            id: UI.TRACKER_MEMO_ID,
            label: UI.TRACKER_MEMO_LABEL,
            type: serverWidget.FieldType.LONGTEXT,     
            container: UI.TRACKER_FIELD_GROUP_ID
        });

        const updatedby_field = form.addField({
            id: UI.TRACKER_UPDATED_BY_ID,
            label: UI.TRACKER_UPDATED_BY_LABEL,
            type: serverWidget.FieldType.TEXT,            
            container: UI.TRACKER_FIELD_GROUP_ID
        });

        const updatedon_field = form.addField({
            id: UI.TRACKER_UPDATED_ON_ID,
            label: UI.TRACKER_UPDATED_ON_LABEL,
            type: serverWidget.FieldType.TEXT,            
            container: UI.TRACKER_FIELD_GROUP_ID
        });

        const status_id_field = form.addField({
            id: UI.TRACKER_STATUS_ID,
            label: UI.TRACKER_STATUS_LABEL,
            type: serverWidget.FieldType.INTEGER,       
            container: UI.TRACKER_FIELD_GROUP_ID
        });
        
        const internal_id_field = form.addField({
            id: UI.TRACKER_INTERNAL_ID,
            label: UI.TRACKER_INTERNAL_ID_LABEL,
            type: serverWidget.FieldType.TEXT,       
            container: UI.TRACKER_FIELD_GROUP_ID
        });        

        // Disable Fields - don't allow editing

        status_name_field.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.DISABLED
        });

        memo_field.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.DISABLED
        });

        updatedby_field.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.DISABLED
        });

        status_id_field.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN
            
        });

        internal_id_field.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN
        });

        updatedon_field.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.DISABLED
        });        

        // Populate Field Values
        if (type !== UserEventType.CREATE) {
            
            const tracker = getTrackerInfoFromSql(newRecord.type, newRecord.id); // get all related trackers for this transaction
            if (tracker) {               
                status_name_field.defaultValue = tracker.status_name;
                memo_field.defaultValue = tracker.memo;
                updatedby_field.defaultValue = `${tracker.updated_by}`;
                updatedon_field.defaultValue = `${tracker.updated_on}`;
                status_id_field.defaultValue = tracker.status_id;
                internal_id_field.defaultValue = tracker.id;
            }
            
        }
    }
  
    /*********************************
     * DATA RETRIEVAL
     *********************************/

    // Return Result of SuiteQL
    function querySuiteQL(sql) {
        return query.runSuiteQL({query: sql}).asMappedResults();
    }

    // Retrive list of Tracker records related to this transaction
    //  return {last_modified, modified_by, status, memo}
    function getTrackerInfoFromSql(record_type, transaction_id) {
        try {

            const sql = `
            select
                id,
                TO_CHAR(lastmodified, 'DD/MM/YYYY HH12:MM AM') as updated_on,
                BUILTIN.DF (lastmodifiedby) as updated_by,
                BUILTIN.DF (${TRACKER_RECORD_FIELDS.STATUS}) as status_name,
                ${TRACKER_RECORD_FIELDS.MEMO} as memo,
                ${TRACKER_RECORD_FIELDS.STATUS} as status_id
            from
                ${TRACKER_RECORD_TYPE}
            where 
                ${TRACKER_RECORD_FIELDS.RECORD_TYPE} = '${record_type}' and
                ${TRACKER_RECORD_FIELDS.LINKED_TRANSACTION} = ${transaction_id}
            order by id desc
            `;
            
            return querySuiteQL(sql)[0];
       
        } catch (error) {

            // Log error, so that we can track which roles having this permisison issue
            log.error({
                title: "getRelatedTrackers",
                details: `${error.message}`
            });
            
            // null indicates error on SuiteQL
            return null; 
        }
    }


    /*********************************
     * RECORD OPERATION
     *********************************/

    // Create A New Tracker Record
    function createTrackerRecord(record_type, transaction_id, status_id, memo) {
        try {

            // create a tracker record in memory
            const trackerRecord = record.create({
                type: TRACKER_RECORD_TYPE,
            });
    
            // configure the values of the tracker
            const fields = {
                [TRACKER_RECORD_FIELDS.RECORD_TYPE]: record_type,
                [TRACKER_RECORD_FIELDS.LINKED_TRANSACTION]: transaction_id,
                [TRACKER_RECORD_FIELDS.STATUS]: status_id,
                [TRACKER_RECORD_FIELDS.MEMO]: memo
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
    }

    // Update A Tracker Record
    function updateTrackerRecord(internal_id, status_id, memo) {

        let tracker_record = record.load({
            type: TRACKER_RECORD_TYPE,
            id: internal_id
        });

        // Set the values
        tracker_record.setValue({
            fieldId: TRACKER_RECORD_FIELDS.STATUS,
            value: status_id,
        });

        tracker_record.setValue({
            fieldId: TRACKER_RECORD_FIELDS.MEMO,
            value: memo
        });

        // Save the updated record
        tracker_record.save();

    }
  
    return { 
        beforeLoad, 
        afterSubmit 
    };

});
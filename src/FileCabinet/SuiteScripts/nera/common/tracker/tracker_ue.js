/**
 * =========================================================================================================
 * Tracker - User Event Script
 * =========================================================================================================
 *
 * Purpose:

 * 
 * Deployment:
 * - Deploy this script Any transaction record types that require tracking 

 * 
 * Script Info:
 * @name tracker_ue
 * @link tracker_cs.js, customrecord_xxx
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @author Min Myat Oo <minmyatoo@nera.net>
 * @copyright Copyright (c) 2024 NERA Telecommunications
 * 
 * =========================================================================================================
 */

define(["N/log", "N/search", "N/runtime", "N/record"], function(
    log,
    search,
    runtime,
    record
    ) {

    /*********************************
     * CONSTANTS
     *********************************/
    const CONSTANTS = {
        RECORDS: {
            TRANSACTION_TRACKER: "customrecord_nera_transaction_tracker",
        },
        DEFAULT_TRACKER_STATUS: 5, // DO: Created, Pending Delivery (Tracker Status)
        FIELDS: {
            LINKED_TRANSACTION: "custrecord_tt_linked_transaction",
            RECORD_TYPES: "custrecord_tt_record_types",
            INTERNAL_ID: "custrecord_tt_internalid",
            TRACKER_STATUS: "custrecord_tt_tracker_status",
            MEMO: "custrecord_tt_memo",
        },
        ROLES: {
            SYSTEM_ADMIN: "3",
        },
        UI: {
            BUTTON_LABEL: "Update Tracker Status",
            CLIENT_SCRIPT_PATH: "./do_cs_update_tracker_status",
        },
    };
  
    /*********************************
     * ENTRY POINT FUNCTIONS
     *********************************/

    function beforeLoad(context) {
        try {
            // const { newRecord, form } = context;
            const newRecord = context.newRecord;
            const form = context.form;
            const recordId = newRecord.id;
            const recordType = newRecord.type;
    
            const executionContext = getExecutionContext();
            // log.debug("Execution Context", executionContext);
    
            // Qualify: Not Create Mode
            if (context.type === "create") {
                return;
            }
    
            const currentRole = String(runtime.getCurrentUser().role);
    
            const allowedRoles = [
                ...getRoleInternalIds("Finance").split(","),
                ...getRoleInternalIds("Nera SA").split(","),
                ...getRoleInternalIds("Nera Logistics").split(","),
            ];
    
            if (!allowedRoles.includes(currentRole)) {
                // log.debug("Info", "Role is not allowed. Skipping...");
                return;
            }
    
            const trackerInfo = queryTracker(recordType, recordId)[0];
            if (trackerInfo?.trackerStatus) {
                addTrackerFields(context, trackerInfo);
            }
    
            form.addButton({
                id: "custpage_do_action",
                label: CONSTANTS.UI.BUTTON_LABEL,
                functionName: `updateTrackerStatus('${recordType}', '${recordId}')`,
            });
    
            form.clientScriptModulePath = CONSTANTS.UI.CLIENT_SCRIPT_PATH;

        } catch (error) {
            // log.error({ title: "Error in beforeLoad", details: error.message });
        }
    };
  
    function afterSubmit(context) {
        try {
            const { newRecord, type, UserEventType } = context;
    
            if (type !== UserEventType.CREATE) return;
    
            const recordId = newRecord.id;
            if (checkIfRecordExists(recordId)) {
            // log.debug({
            //     title: "Record Already Tracked",
            //     details: `DO ID ${recordId} is already tracked.`,
            // });
            return;
            }
    
            createTracker({
                recordType: newRecord.type,
                recordId,
                trackerStatus: CONSTANTS.DEFAULT_TRACKER_STATUS,
                memo: "",
            });

        } catch (error) {
            // log.error({ title: "Error in afterSubmit", details: error.message });
        }
    };

    
    /*********************************
     * SEARCH FUNCTIONS
     *********************************/
    /**
     * Query transaction tracker records
     * @param {string} recordType - The type of record to query
     * @param {string} recordId - The internal ID of the record
     * @returns {Array<Object>} Array of tracker information
     */
    function queryTracker(recordType, recordId) {
        try {
            // Check if recordId is empty, null, or undefined
            if (!recordId) {
                log.debug("Info", "RecordId is empty. Skipping tracker query...");
                return [];
            }
    
            // Check if recordType is empty
            if (!recordType) {
                log.debug("Info", "RecordType is empty. Skipping tracker query...");
                return [];
            }
    
            const searchResults = [];
            const trackerSearch = search.create({
                type: CONSTANTS.RECORDS.TRANSACTION_TRACKER,
                filters: [
                    [CONSTANTS.FIELDS.RECORD_TYPES, "is", recordType],
                    "AND",
                    [CONSTANTS.FIELDS.INTERNAL_ID, "is", recordId],
                ],
                columns: [
                    "internalid",
                    CONSTANTS.FIELDS.TRACKER_STATUS,
                    CONSTANTS.FIELDS.MEMO,
                ].map((name) => search.createColumn({ name })),
            });
    
            trackerSearch.run().each((result) => {
                searchResults.push({
                    internalid: result.getValue("internalid"),
                    trackerStatus: result.getText(CONSTANTS.FIELDS.TRACKER_STATUS),
                    memo: result.getValue(CONSTANTS.FIELDS.MEMO),
                });
                return true;
            });
    
            return searchResults;

        } catch (error) {
            // log.error({
            //     title: "Error in queryTracker",
            //     details: `Error occurred for recordType: ${recordType}, recordId: ${recordId}. ${error.message}`,
            // });
            return [];
        }
    };
  
    /**
     * Get role internal IDs based on name pattern
     * @param {string} contains - Text pattern to match in role names
     * @returns {string} Comma-separated list of role IDs
     */
    function getRoleInternalIds(contains) {
        try {
            const roleIds = [CONSTANTS.ROLES.SYSTEM_ADMIN]; // Include default admin role
            const roleSearch = search.create({
                type: "role",
                filters: [
                    ["name", "contains", contains],
                    "AND",
                    ["isinactive", "is", "F"],
                ],
                columns: ["internalid"],
                });
        
                roleSearch.run().each((result) => {
                roleIds.push(result.getValue("internalid"));
                return true;
            });
    
            return roleIds.join(",");
        } catch (error) {
            // log.error({
            //     title: "Error in getRoleInternalIds",
            //     details: error.message,
            // });
            return "";
        }
    };
  
    /*********************************
     * FORM MODIFICATION FUNCTIONS
     *********************************/
    /**
     * Add tracker status fields to the form
     * @param {Object} context - Script context
     * @param {Object} trackerInfo - Tracker information
     */
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
    /**
     * Check if record exists in tracker
     * @param {string} recordId - Record internal ID
     * @returns {boolean} Whether record exists
     */
    function checkIfRecordExists(recordId) {
        const trackerSearch = search.create({
            type: CONSTANTS.RECORDS.TRANSACTION_TRACKER,
            filters: [[CONSTANTS.FIELDS.LINKED_TRANSACTION, "is", recordId]],
            columns: ["internalid"],
        });
    
        return trackerSearch.runPaged().count > 0;
    };
  
    /**
     * Create new tracker record
     * @param {Object} params - Tracker parameters
     * @returns {string} Created record ID
     */
    function createTracker({ recordType, recordId, trackerStatus, memo }) {
        try {
            const trackerRecord = record.create({
                type: CONSTANTS.RECORDS.TRANSACTION_TRACKER,
            });
    
            const fields = {
                [CONSTANTS.FIELDS.RECORD_TYPES]: recordType,
                [CONSTANTS.FIELDS.INTERNAL_ID]: recordId,
                [CONSTANTS.FIELDS.LINKED_TRANSACTION]: recordId,
                [CONSTANTS.FIELDS.TRACKER_STATUS]: trackerStatus,
                [CONSTANTS.FIELDS.MEMO]: memo,
            };
    
            Object.entries(fields).forEach(([fieldId, value]) => {
                trackerRecord.setValue({ fieldId, value });
            });
    
            const ttId = trackerRecord.save();
            log.debug({
                title: "Transaction Tracker Created",
                details: `ID: ${ttId}`,
            });
            return ttId;

        } catch (error) {
            log.error({ title: "Error in createTracker", details: error.message });
            return null;
        }
    };
  
  
    function getExecutionContext(){
        try {
            const currentUser = runtime.getCurrentUser();
            const { name, email, roleCenter } = currentUser;
    
            return {
            "User Information": { name, email },
            "Role Details": { roleCenter },
            };

        } catch (error) {
                log.error({
                title: "Error in getExecutionContext",
                details: `Failed to get execution context: ${error.message}`,
            });
            return {};
        }
    };
  
    return { 
        beforeLoad, 
        afterSubmit 
    };
  });
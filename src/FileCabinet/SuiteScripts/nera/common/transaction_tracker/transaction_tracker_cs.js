/**
 * =========================================================================================================
 * NetSuite Tracker - Client Script
 * =========================================================================================================
 *
 * Purpose:
 *  
 * Deployment: Do Not Deploy, instaed inject this CS from associated UE
 *
 * Script Information:
 * @name transaction_tracker_cs.js
 * @link transaction_tracker_ue.js, customrecord_nera_transaction_tracker
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @author Min Myat Oo <minmyatoo@nera.net>
 * @copyright Copyright (c) 2024 NERA Telecommunications'
 * 
 * =========================================================================================================
 */

define(["N/currentRecord", "N/record", "N/query", "N/log", "N/ui/message", "N/runtime"], 
function (currentRecord, record, query, log, msg, runtime) {

    /*********************************
     * CONSTANTS
     *********************************/
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
    const WEBIX = {
        TRACKER_FORM_ID : 'wb_tracker_form'
    };
    const URL_PARAM = {
        UPDATED: 'tt_updated'
    };

    let STATUS_OPTIONS = [];

    /*********************************
     * START UP
     *********************************/

    // Load the current record   
    const THIS_RECORD = currentRecord.get();

    // Show message of updated if previously updated in View mode
    showUpdatedMessageOnStartup();

    // Inject Webix if Not Already Loaded by Other Scripts
    if (typeof webix === 'undefined') {

        injectCSS([
            'https://neracdn.azureedge.net/webix/webix.min.css',
            'https://neracdn.azureedge.net/material-font/css/materialdesignicons.min.css'
        ]);
    
        injectScripts([
            'https://neracdn.azureedge.net/webix/webix.min.js'
        ]);
    }


    /*********************************
     * LIBRARY INJECTORS
     *********************************/

    function injectCSS(css_array) {
        css_array.forEach(css_link => {
            let link_elem = document.createElement("link");
            link_elem.rel = "stylesheet"; 
            link_elem.type = "text/css";
            link_elem.href = css_link;
            document.head.appendChild(link_elem);  
        });
    };

    function injectScripts(script_array) {
        script_array.forEach(script_link => {
            let script_elem  = document.createElement('script');
            script_elem.type = 'text/javascript';
            script_elem.async = false;										
            script_elem.src  = script_link;
            document.head.appendChild(script_elem); 
        });
    };
   

    /*********************************
     * UI OPERATION
     *********************************/

    // Pop up Webix Form
    // User clicked "Update Tracker Status" button created by User Event script
    function showTrackerPopup() {

        // Depending on Form mode, get the related tracker info
        const tracker_info = (THIS_RECORD.isDynamic || THIS_RECORD.isNew)
            ? getTrackerInfoFromUI(THIS_RECORD.type, THIS_RECORD.id)
            : getTrackerInfoFromSql(THIS_RECORD.type, THIS_RECORD.id)

        // Get The List Of Status
        const status_sql = `
            select
                id, name as value
            from
                CUSTOMLIST_NERA_TRACKER_STATUS
            order by name ASC
        `;
        STATUS_OPTIONS = querySuiteQL(status_sql);

        // Construct and Display The Popup
        webix.ui({
            view:"window",
            head:"Transaction Tracker",
            position:"center",
            move:true,
            body:{
                type: 'space',
                margin: 5,
                rows: [
                {
                    view: 'form',
                    id: WEBIX.TRACKER_FORM_ID,
                    scroll: false,
                    elements: [
                        { id: 'id',     name: 'id', view:"text", value: tracker_info.id, label:"Tracker ID", disabled: true},
                        // { id: 'transaction_id',     name: 'transaction_id', view:"text", value: tracker.transaction_id, label:"Transaction ID", disabled: true},
                        { id: 'status', name: 'status', view:"select", width: 350, options: STATUS_OPTIONS, value: tracker_info.status_id||DEFAULT_TRACKER_STATUS, label:"Status"},
                        { id: 'memo',   name: 'memo',   view:"text",   value: tracker_info.memo, label:"Memo", label:"Memo"},
                        { 
                            margin:5, 
                            cols:[
                                { view:"button", value:"Cancel", click: _btnCancel },
                                { view:"button", value:"Update", click: _btnUpdate, css:"webix_primary"}
                            ]
                        }
                    ]
                }
                ]
            }
        }).show();

        // User clicked "Close"
        function _btnCancel() {
            this.getTopParentView().close();
        }

        // User clicked "Update"
        function _btnUpdate() {
            
            // Form is in EDIT or CREATE mode
            if (THIS_RECORD.isDynamic || THIS_RECORD.isNew) {
                updateWebixToNetSuiteForm();
            }

            // Form is in VIEW mode
            if (THIS_RECORD.isReadOnly) {
                // save first, then reload page
                updateWebixToNetSuiteRecord();
            }
            
            // close the window
            this.getTopParentView().close();
        }

    }

    // Check if we need to show up notification message that tracker had been updated
    // Startup --> showUpdatedMessageOnStartup()
    function showUpdatedMessageOnStartup() {
        const url_params = new URLSearchParams(window.location.search);
        if (url_params.has(URL_PARAM.UPDATED)) {
            // Inform the user of the successful saving
            msg.create({
                title: "Transaction Tracker Updated",
                message: "You had updated this transaction tracker.",
                type: msg.Type.CONFIRMATION
            }).show({
                duration: 5000 // 5 seconds
            });

            // Delete the param, we just want to show once
            const url = new URL(window.location.href);
            url.searchParams.delete(URL_PARAM.UPDATED);
            window.history.pushState({}, '', url.toString());
        }
    }


    /*********************************
     * DATA RETRIEVAL
     *********************************/

    // Return Result of SuiteQL
    function querySuiteQL(sql) {
        return query.runSuiteQL({query: sql}).asMappedResults();
    }

    // Get Tracker Info in VIEW mode, through SQL
    //  return {id, status_id, memo, updated_on, updated_by, status_name}
    function getTrackerInfoFromSql(record_type, transaction_id) {
        try {

            const sql = `
            select
                id,
                TO_CHAR(lastmodified, 'YYYY-MM-DD') as updated_on,
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

    // Get tracker Info in CREATE/EDIT mode
    //  return {id, status_id, memo, updated_on}
    function getTrackerInfoFromUI() {
        
        const id = THIS_RECORD.getValue({
            fieldId: UI.TRACKER_INTERNAL_ID
        });

        const status_id = THIS_RECORD.getValue({
            fieldId: UI.TRACKER_STATUS_ID
        });

        const memo = THIS_RECORD.getValue({
            fieldId: UI.TRACKER_MEMO_ID
        });

        return {
            id: id,
            status_id: status_id,
            memo: memo
        }
    }


    /*********************************
     * RECORD OPERATION
     *********************************/

    // In Edit and Create mode: we store the value to the form. When user click Submit (UE), it will be saved
    // _btnUpdate --> updateWebixToNetSuiteForm
    function updateWebixToNetSuiteForm() {

        const webix_values = webix.$$(WEBIX.TRACKER_FORM_ID).getValues();
        var current_user = runtime.getCurrentUser();

        THIS_RECORD.setValue({
            fieldId: UI.TRACKER_STATUS_ID,
            value: webix_values.status
        });

        THIS_RECORD.setValue({
            fieldId: UI.TRACKER_MEMO_ID,
            value: webix_values.memo
        });

        THIS_RECORD.setValue({
            fieldId: UI.TRACKER_STATUS_NAME_ID,
            value: STATUS_OPTIONS.find(e => e.id == webix_values.status).value
        });

        THIS_RECORD.setValue({
            fieldId: UI.TRACKER_UPDATED_BY_ID,
            value: current_user.name
        })
    }

    // In View Mode: we update the data directly to the record using script then refresh the page
    // _btnUpdate --> updateWebixToNetSuiteRecord
    function updateWebixToNetSuiteRecord() {
        try {
            const webix_values = webix.$$(WEBIX.TRACKER_FORM_ID).getValues();
           
            // Load the existing transaction tracker record
            let tracker_record = record.load({
                type: TRACKER_RECORD_TYPE,
                id: webix_values.id
            });

            // If tracker record not found, create it
            if (!tracker_record) {
                tracker_record = record.create({
                    type: TRACKER_RECORD_TYPE
                });
            }

            // Set the values

            tracker_record.setValue({
                fieldId: TRACKER_RECORD_FIELDS.LINKED_TRANSACTION,
                value: THIS_RECORD.id,
            });

            tracker_record.setValue({
                fieldId: TRACKER_RECORD_FIELDS.RECORD_TYPE,
                value: THIS_RECORD.type,
            });

            tracker_record.setValue({
                fieldId: TRACKER_RECORD_FIELDS.STATUS,
                value: webix_values.status,
            });

            tracker_record.setValue({
                fieldId: TRACKER_RECORD_FIELDS.MEMO,
                value: webix_values.memo
            });

            // Save the updated record
            tracker_record.save();

            // Reload the page with a updated param, so that notification shows up to inform tracker updated
            const url = new URL(window.location.href);
            url.searchParams.set(URL_PARAM.UPDATED, 'T');
            window.location.href = url.toString();

        } catch (error) {

            // Permission issue, log error
            log.error({ title: "updateWebixToNetSuiteRecord", details: error.message });

            // inform the user
            msg.create({
                title: "Transaction Tracker Update Failure",
                message: "You don't have permission to update Transaction Tracker.",
                type: msg.Type.ERROR
            }).show({
                duration: 5000 // 5 seconds
            });
        }
    }

    // expose the function to UE created elements
    return {
        showTrackerPopup
    };

  });
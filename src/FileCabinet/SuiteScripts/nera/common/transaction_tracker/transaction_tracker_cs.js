/**
 * =========================================================================================================
 * NetSuite Tracker - Client Script
 * =========================================================================================================
 *
 * Purpose:
 *  
 * Deployment: Not Deployed, instaed inject this CS from associated UE
 *
 * Script Information:
 * @name tracker_cs.js
 * @link tracker_ue.js, customrecord_nera_transaction_tracker
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @author Min Myat Oo <minmyatoo@nera.net>
 * @copyright Copyright (c) 2024 NERA Telecommunications'
 * 
 * =========================================================================================================
 */

define(["N/record", "N/query", "N/log", "N/ui/message", "N/search"], function (record, query, log, message, search) {

    /*********************************
     * CONSTANTS
     *********************************/
    const TRANSACTION_TRACKER_RECORD = "customrecord_nera_transaction_tracker";
  
    /*********************************
     * HELPERS
     *********************************/

    /**
     * Updates the transaction tracker record with the specified status and memo.
     *
     * @param {string} recordType - The type of the record to be updated.
     * @param {number} internalId - The internal ID of the transaction tracker record.
     * @param {string} trackerStatus - The new status to set for the tracker.
     * @param {string} memo - The memo to set for the tracker.
     * @throws {Error} Throws an error if the record cannot be loaded or saved.
     */
    function updateTracker(recordType, internalId, trackerStatus, memo) {
        try {
            // Load the existing transaction tracker record
            const transactionTracker = record.load({
                type: recordType,
                id: internalId,
            });
            // Set the value for the 'custrecord_tt_tracker_status' field
            transactionTracker.setValue({
                fieldId: "custrecord_tt_tracker_status",
                value: trackerStatus,
            });
            transactionTracker.setValue({
                fieldId: "custrecord_tt_memo",
                value: memo,
            });
            // Save the updated record
            transactionTracker.save();
            // console.log(`Transaction tracker record with internal ID ${internalId} updated successfully.`);

        } catch (error) {
            // console.error("[Error in updateTransactionTracker]", error);
        }
    }

    /**
     * Queries transaction tracker records by record type and ID.

     * @param {string} recordType - The type of the record.
     * @param {number} recordId - The internal ID of the record. If empty, returns an empty array.
     * @returns {Array<Object>} An array of transaction tracker information.
     */ 
    function queryTracker(recordType, recordId) {
        try {
            // Check if recordId is empty, null, or undefined
            if (!recordId) {
                log.debug("Info", "RecordId is empty. Skipping tracker query...");
                return [];
            }
            const trackerObj = search.create({
                type: "customrecord_nera_transaction_tracker",
                filters: [
                    ["custrecord_tt_record_types", "is", recordType],
                    "AND",
                    ["custrecord_tt_internalid", "is", recordId],
                ],
                columns: [
                    search.createColumn({ name: "internalid", sort: search.Sort.ASC }),
                    search.createColumn({ name: "custrecord_tt_tracker_status" }),
                    search.createColumn({ name: "custrecord_tt_memo" }),
                ],
            });
            const transactionTrackerInfo = [];
            trackerObj.run().each((result) => {
                const internalid = result.getValue({ name: "internalid" });
                const trackerStatus = result.getValue({
                    name: "custrecord_tt_tracker_status",
                });
                const trackerStatusText = result.getText({
                    name: "custrecord_tt_tracker_status",
                });
                const trackerMemo = result.getValue({ name: "custrecord_tt_memo" });
                transactionTrackerInfo.push({
                    internalid,
                    trackerStatus,
                    trackerStatusText,
                    trackerMemo,
                });
                return true;
            });
            return transactionTrackerInfo;

        } catch (error) {
            log.error({
                title: "Error in queryTracker",
                details: error.toString(),
            });
            return [];
        }
    }

    /**
     * Creates a transaction tracker record with the specified details.
     *
     * @param {Object} obj - The object containing tracker details.
     * @param {string} obj.recordType - The type of the record.
     * @param {number} obj.recordId - The internal ID of the record.
     * @param {string} obj.trackerStatus - The status of the tracker.
     * @param {string} obj.memo - The memo for the tracker.
     * @returns {number} The internal ID of the created transaction tracker record.
     */
    function createTracker(obj) {
        try {
            let { recordType, recordId, trackerStatus, memo } = obj;
            // console.log("Obj", obj);
            let tranTracker = record.create({
                type: TRANSACTION_TRACKER_RECORD,
            });
            // Generate a unique name with a random number and timestamp (yymmddhhmmss)
            const timestamp = new Date()
            .toISOString()
            .replace(/[-:.TZ]/g, "")
            .slice(0, 12); // yymmddhhmmss
            const randomNum = Math.floor(Math.random() * 1000) + 1; // Random number between 1 and 1000
            const name = `TT${timestamp}${randomNum}`;
            tranTracker.setValue({
                fieldId: "custrecord_tt_record_types",
                value: recordType,
            });
            tranTracker.setValue({
                fieldId: "custrecord_tt_internalid",
                value: recordId,
            });
            tranTracker.setValue({
                fieldId: "custrecord_tt_linked_transaction",
                value: recordId,
            });
            tranTracker.setValue({
                fieldId: "custrecord_tt_tracker_status",
                value: trackerStatus,
            });
            tranTracker.setValue({
                fieldId: "custrecord_tt_memo",
                value: memo,
            });
            const ttId = tranTracker.save({
                ignoreMandatoryFields: false,
            });
            return ttId;

        } catch (error) {
            log.debug({
                title: "[Error]",
                details: error,
            });
        }
    }

    /**
     * Sets the status of a transaction tracker record. If the record does not exist, it creates a new one.
     *
     * @param {string} recordType - The type of the record.
     * @param {number} recordId - The internal ID of the record.
     * @param {string} trackerStatus - The new status to set for the tracker.
     * @param {string} memo - The memo to associate with the tracker.
     */
    function setTrackerStatus(recordType, recordId, trackerStatus, memo) {
        try {
            // console.log(recordType);
            // console.log(recordId);
            // console.log(trackerStatus);
            let queryTrackerObj = queryTracker(recordType, recordId);
            if (queryTrackerObj.length === 0) {
                // If no record found, create a new one
                // console.log("No transaction tracker record found. Creating a new one.");
                createTracker({ recordType, recordId, trackerStatus, memo });
            } else {
                // If record found, update it
                // console.log("Transaction tracker record found. Updating the existing record.");
                updateTracker(
                    TRANSACTION_TRACKER_RECORD,
                    queryTrackerObj[0].internalid,
                    trackerStatus,
                    memo
                );
            }
            // Show success message
            message
            .create({
                title: "Success",
                message: "Transaction tracker record updated successfully.",
                type: message.Type.CONFIRMATION,
            })
            .show();
            // Reload the window
            setTimeout(function () {
                window.location.reload();
            }, 1000);

        } catch (error) {
            // console.error("[Error in doSigned]", error);
        }
    }
  
    /**
     * Retrieves active tracker status options from the custom list.
     *
     * @returns {Array<Object>} An array of objects containing the internal ID and name of each tracker status.
     */
    function getTrackerStatus() {
        const trackerObj = search.create({
            type: "customlist_nera_tracker_status",
            filters: [["isinactive", "is", "F"]],
            columns: [
            search.createColumn({ name: "name", label: "Name" }),
            search.createColumn({
                name: "internalid",
                label: "Internal ID",
                sort: search.Sort.ASC,
            }),
            ],
        });
        const searchResults = trackerObj.run();
        const items = [];
        searchResults.each(function (result) {
            const name = result.getValue({ name: "name" });
            const id = result.getValue({ name: "internalid" });
            items.push({ id: id, name: name });
            return true;
        });
        return items;
    }

    /**
     * Updates the tracker status for a given record type and ID by displaying a popup for user input.
     *
     * @param {string} recordType - The type of the record to update.
     * @param {number} recordId - The internal ID of the record to update.
     */
    function updateTrackerStatus(recordType, recordId) {
        // Fetch the tracker data
        const trackerData = queryTracker(recordType, recordId);
        let selectedTrackerStatus = "";
        let selectedMemo = "";
        // Extract the first entry from the tracker data if it exists
        if (trackerData.length > 0) {
            selectedTrackerStatus = trackerData[0].trackerStatus; // Use the status value (not the text) to match the option value
            selectedMemo = trackerData[0].trackerMemo || ""; // Set the memo field value, or default to an empty string
        }
        // Create a popup container
        const popupContainer = document.createElement("div");
        popupContainer.id = "popupContainer";
        popupContainer.style.position = "fixed";
        popupContainer.style.top = "50%";
        popupContainer.style.left = "50%";
        popupContainer.style.transform = "translate(-50%, -50%)";
        popupContainer.style.width = "400px";
        popupContainer.style.padding = "20px";
        popupContainer.style.backgroundColor = "white";
        popupContainer.style.borderRadius = "8px";
        popupContainer.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
        popupContainer.style.zIndex = "1000";
        popupContainer.style.fontFamily = "Arial, sans-serif";
        popupContainer.style.border = "1px solid #ddd";
        // Create a header for the popup (for dragging)
        const header = document.createElement("div");
        header.style.backgroundColor = "#007bff";
        header.style.color = "white";
        header.style.padding = "10px";
        header.style.borderRadius = "8px 8px 0 0";
        header.style.fontSize = "16px";
        header.style.fontWeight = "bold";
        header.style.textAlign = "center";
        header.textContent = "Update Tracker Status";
        header.style.cursor = "move"; // Set cursor to move
        popupContainer.appendChild(header);
        // Variables for dragging functionality
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;
        // Mouse down event to start dragging
        header.addEventListener("mousedown", (e) => {
            isDragging = true;
            offsetX = e.clientX - popupContainer.getBoundingClientRect().left;
            offsetY = e.clientY - popupContainer.getBoundingClientRect().top;
            document.body.style.userSelect = "none"; // Disable text selection during drag
        });
        // Mouse move event to move the popup
        document.addEventListener("mousemove", (e) => {
            if (isDragging) {
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;
            popupContainer.style.left = `${x}px`;
            popupContainer.style.top = `${y}px`;
            popupContainer.style.transform = "none"; // Remove the centering transformation
            }
        });
        // Mouse up event to stop dragging
        document.addEventListener("mouseup", () => {
            isDragging = false;
            document.body.style.userSelect = ""; // Re-enable text selection after drag
        });
        // Create a form container
        const formContainer = document.createElement("div");
        formContainer.style.display = "grid";
        formContainer.style.gridTemplateColumns = "1fr";
        formContainer.style.gap = "10px";
        formContainer.style.marginTop = "10px";
        popupContainer.appendChild(formContainer);
        // Create a label and select box for tracker status
        const trackerLabel = document.createElement("label");
        trackerLabel.htmlFor = "trackerStatusSelect";
        trackerLabel.textContent = "Select Tracker Status:";
        trackerLabel.style.fontWeight = "bold";
        formContainer.appendChild(trackerLabel);
        const trackerSelect = document.createElement("select");
        trackerSelect.id = "trackerStatusSelect";
        trackerSelect.style.width = "100%";
        trackerSelect.style.padding = "10px";
        trackerSelect.style.border = "1px solid #ddd";
        trackerSelect.style.borderRadius = "4px";
        trackerSelect.style.fontSize = "14px";
        // Add options to the select box
        const trackerStatusList = getTrackerStatus();
        trackerStatusList.forEach((status) => {
            const option = document.createElement("option");
            option.value = status.id;
            option.textContent = status.name;
            trackerSelect.appendChild(option);
        });
        // Set the selected tracker status if available
        if (selectedTrackerStatus) {
            trackerSelect.value = selectedTrackerStatus; // Set the dropdown to the value of the retrieved status
        }
        formContainer.appendChild(trackerSelect);
        // Create a label and text area for the memo
        const memoLabel = document.createElement("label");
        memoLabel.htmlFor = "memoTextArea";
        memoLabel.textContent = "Enter Memo:";
        memoLabel.style.fontWeight = "bold";
        formContainer.appendChild(memoLabel);
        const memoTextArea = document.createElement("textarea");
        memoTextArea.id = "memoTextArea";
        memoTextArea.style.width = "100%";
        memoTextArea.style.height = "100px";
        memoTextArea.style.padding = "10px";
        memoTextArea.style.border = "1px solid #ddd";
        memoTextArea.style.borderRadius = "4px";
        memoTextArea.style.fontSize = "14px";

        // Set the memo field value if available
        memoTextArea.value = selectedMemo; // Populate the memo field with the retrieved value or leave it empty
        formContainer.appendChild(memoTextArea);

        // Create help text under the memo field
        const helpText = document.createElement("div");
        helpText.textContent = `Memo is to indicate info for items which are being returned (eg. item code, Qty, serial number, etc.) and to indicate reason for goods being returned.`;
        helpText.style.fontSize = "12px";
        helpText.style.color = "#6c757d";
        helpText.style.marginTop = "5px";
        formContainer.appendChild(helpText);

        // Create a button container
        const buttonContainer = document.createElement("div");
        buttonContainer.style.display = "flex";
        buttonContainer.style.justifyContent = "flex-end";
        buttonContainer.style.marginTop = "20px";
        popupContainer.appendChild(buttonContainer);

        // Create OK button
        const okButton = document.createElement("button");
        okButton.textContent = "OK";
        okButton.style.padding = "10px 20px";
        okButton.style.border = "none";
        okButton.style.borderRadius = "4px";
        okButton.style.backgroundColor = "#007bff";
        okButton.style.color = "white";
        okButton.style.cursor = "pointer";
        okButton.style.fontWeight = "bold";
        okButton.style.marginRight = "10px";
        okButton.style.transition = "background-color 0.3s";
        okButton.onmouseover = function () {
            okButton.style.backgroundColor = "#0056b3";
        };
        okButton.onmouseout = function () {
            okButton.style.backgroundColor = "#007bff";
        };
        buttonContainer.appendChild(okButton);

        // Create Cancel button
        const cancelButton = document.createElement("button");
        cancelButton.textContent = "Cancel";
        cancelButton.style.padding = "10px 20px";
        cancelButton.style.border = "none";
        cancelButton.style.borderRadius = "4px";
        cancelButton.style.backgroundColor = "#6c757d";
        cancelButton.style.color = "white";
        cancelButton.style.cursor = "pointer";
        cancelButton.style.fontWeight = "bold";
        cancelButton.style.transition = "background-color 0.3s";
        cancelButton.onmouseover = function () {
            cancelButton.style.backgroundColor = "#5a6268";
        };
        cancelButton.onmouseout = function () {
            cancelButton.style.backgroundColor = "#6c757d";
        };
        buttonContainer.appendChild(cancelButton);

        // Append the popup to the body
        document.body.appendChild(popupContainer);

        // Add event listener for the OK button
        okButton.addEventListener("click", function () {
            const selectedStatus = trackerSelect.value;
            const memoText = memoTextArea.value;
            const DO_PARTIAL_RETURNED = "2";
            // Call function to set the tracker status with updated values
            if (selectedStatus === DO_PARTIAL_RETURNED && !memoText) {
                showAlert(
                    "Action Required: Memo Missing",
                    "To proceed, please provide a memo when setting the status to 'DO: Partially Returned'. This memo helps to track partial returns and maintain accurate records."
                );
                return; // Exit the function if memo is required
            }
            if (selectedStatus) {
                // console.log("Selected Tracker Value:", selectedStatus);
                // console.log("Memo:", memoText);
                setTrackerStatus(recordType, recordId, selectedStatus, memoText);
                // Remove the popup from the DOM
                document.body.removeChild(popupContainer);
            } else {
                alert("Please select a tracker status.");
            }
        });

        // Add event listener for the Cancel button
        cancelButton.addEventListener("click", function () {
            // Remove the popup from the DOM
            document.body.removeChild(popupContainer);
        });
    }
  
    /*********************************
     * UI COMPONENTS
     *********************************/
    /**
     * Displays a modal alert box with a title and message.
     *
     * @param {string} title - The title of the alert box.
     * @param {string} message - The message content of the alert box.
     */
    function showAlert(title, message) {
        // Create the container for the alert box
        const alertContainer = document.createElement("div");
        alertContainer.style.position = "fixed";
        alertContainer.style.top = "0";
        alertContainer.style.left = "0";
        alertContainer.style.width = "100%";
        alertContainer.style.height = "100%";
        alertContainer.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
        alertContainer.style.display = "flex";
        alertContainer.style.justifyContent = "center";
        alertContainer.style.alignItems = "center";
        alertContainer.style.zIndex = "1000";
        // Create the content box for the alert
        const alertBox = document.createElement("div");
        alertBox.style.backgroundColor = "#fff";
        alertBox.style.padding = "20px";
        alertBox.style.borderRadius = "10px";
        alertBox.style.border = "2px solid #007bff"; // Border added
        alertBox.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)"; // Enhanced shadow
        alertBox.style.textAlign = "center";
        alertBox.style.width = "350px";
        alertBox.style.maxWidth = "90%";
        // Title of the alert
        const alertTitle = document.createElement("h2");
        alertTitle.innerText = title;
        alertTitle.style.marginBottom = "10px";
        alertTitle.style.color = "#333";
        alertTitle.style.fontSize = "20px";
        alertTitle.style.borderBottom = "1px solid #ddd"; // Border line under title
        alertTitle.style.paddingBottom = "10px";
        // Message content of the alert
        const alertMessage = document.createElement("p");
        alertMessage.innerText = message;
        alertMessage.style.marginBottom = "20px";
        alertMessage.style.fontSize = "14px";
        alertMessage.style.color = "#555";
        // OK button
        const okButton = document.createElement("button");
        okButton.innerText = "OK";
        okButton.style.padding = "12px 25px";
        okButton.style.border = "none";
        okButton.style.backgroundColor = "#007bff";
        okButton.style.color = "#fff";
        okButton.style.borderRadius = "5px";
        okButton.style.cursor = "pointer";
        okButton.style.transition = "background-color 0.3s ease";
        okButton.style.fontSize = "14px";
        // Button hover effect
        okButton.addEventListener("mouseover", function () {
            okButton.style.backgroundColor = "#0056b3";
        });
        okButton.addEventListener("mouseout", function () {
            okButton.style.backgroundColor = "#007bff";
        });
        // Append elements to alert box
        alertBox.appendChild(alertTitle);
        alertBox.appendChild(alertMessage);
        alertBox.appendChild(okButton);
        alertContainer.appendChild(alertBox);
        document.body.appendChild(alertContainer);
        // Event listener for closing the alert box
        okButton.addEventListener("click", function () {
            document.body.removeChild(alertContainer);
        });
    }

    // expose the function to UE created elements
    return {
        updateTrackerStatus,
        setTrackerStatus,
    };

  });
import React, { useEffect } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Row, Col, FormGroup, Spinner } from "reactstrap";
import { Icon, RSelect } from "../../../components/Component";
import { canMapTctBank } from "../../../library/bankMappingAccess";

const MapBankModal = ({
  isOpen,
  toggle,
  selectedStudentName,
  bankList,
  formData,
  setFormData,
  onFormSubmit,
  onFormCancel,
  register,
  errors,
  handleSubmit,
  setValue,
  clearErrors,
  trigger,
  loading,
}) => {
  const activeBankList = (bankList || []).filter((bank) => bank.isActive !== false);

  // Register all mandatory fields with validation (matches pattern from EnrollStudent)
  useEffect(() => {
    const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";
    register("Id", {
    validate: (v) =>
      v && v !== EMPTY_GUID ? true : "Bank is required",
  });
    register("GSTPercentage", { 
      required: "GST Percentage is required",
      min: { value: 0, message: "GST Percentage must be 0 or greater" },
      max: { value: 100, message: "GST Percentage must be 100 or less" }
    });
    register("VATPercentage", { 
      required: "VAT Percentage is required",
      min: { value: 0, message: "VAT Percentage must be 0 or greater" },
      max: { value: 100, message: "VAT Percentage must be 100 or less" }
    });
    register("Currency", { required: "Currency is required" });
    // Client fields are optional - no validation required
  }, [register]);

  // Update form values and trigger validation when formData changes
  useEffect(() => {
   setValue("Id", formData?.Id);
    setValue("GSTPercentage", formData?.GSTPercentage);
    setValue("VATPercentage", formData?.VATPercentage);
    setValue("Currency", formData?.Currency);
    setValue("ClientGST", formData?.ClientGST);
    setValue("ClientPAN", formData?.ClientPAN);
    setValue("ClientGSTStateCode", formData?.ClientGSTStateCode);
    setValue("ClientCountryCode", formData?.ClientCountryCode);
    
    if (formData?.Id) trigger("Id");
    if (formData?.GSTPercentage !== undefined && formData?.GSTPercentage !== null) trigger("GSTPercentage");
    if (formData?.VATPercentage !== undefined && formData?.VATPercentage !== null) trigger("VATPercentage");
    if (formData?.Currency) trigger("Currency");
  }, [
    formData?.Id, 
    formData?.GSTPercentage, 
    formData?.VATPercentage, 
    formData?.Currency,
    formData?.ClientGST,
    formData?.ClientPAN,
    formData?.ClientGSTStateCode,
    formData?.ClientCountryCode,
    setValue, 
    trigger
  ]);
  
  if (!canMapTctBank(localStorage.getItem("userRole"))) return null;
  return (
    <Modal
      scrollable={false}
      isOpen={isOpen}
      toggle={toggle}
      className="modal-dialog-centered"
      size="md"
    >
      <ModalHeader toggle={toggle}>Map TCT Bank details</ModalHeader>
      <form id="mapBankForm" onSubmit={handleSubmit(onFormSubmit)}>

        <ModalBody>
          <div className="p-2">
            <h5 className="title">Student: {selectedStudentName}</h5>
            <div className="mt-4">
              <Row className="g-3">
                {/* Row 1: Bank and GST Percentage */}
                <Col md="6">
                  <FormGroup>
                    <label className="form-label">
                      Bank <span className="text-danger">*</span>
                    </label>
                    <div className="form-control-wrap">
                      <RSelect
                        dataSource={activeBankList.map((bank) => ({
                          label: bank.bankName,
                          value: bank.id,
                        }))}
                        value={activeBankList
                          .map((bank) => ({
                            label: bank.bankName,
                            value: bank.id,
                          }))
                          .find((option) => option.value === formData?.Id) || null}
                        value1={formData?.Id}
                        onChangeHandler={(e) => {
                          setFormData((prev) => ({ ...prev, Id: e.value }));
                          setValue("Id", e.value);
                          clearErrors("Id");
                        }}
                        placeholder="Select bank"
                      />
                    </div>
                    {errors.Id && (
                      <span
                        className="invalid"
                        style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}
                      >
                        {errors.Id.message}
                      </span>
                    )}
                  </FormGroup>
                </Col>

                <Col md="6">
                  <FormGroup>
                    <label className="form-label">
                      GST Percentage <span className="text-danger">*</span>
                    </label>
                    <div className="form-control-wrap">
                      <div className="input-group">
                        <input
                          type="number"
                          className="form-control"
                          name="GSTPercentage"
                          value={formData?.GSTPercentage || ""}
                          onChange={(e) => {
                            const value = e.target.value === "" ? null : parseInt(e.target.value);
                            setFormData((prev) => ({ ...prev, GSTPercentage: value }));
                            setValue("GSTPercentage", value);
                            clearErrors("GSTPercentage");
                          }}
                          placeholder="Enter GST %"
                          min="0"
                          max="100"
                        />
                        <div className="input-group-append">
                          <span className="input-group-text">%</span>
                        </div>
                      </div>
                    </div>
                    {errors.GSTPercentage && (
                      <span
                        className="invalid"
                        style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}
                      >
                        {errors.GSTPercentage.message}
                      </span>
                    )}
                  </FormGroup>
                </Col>

                {/* Row 2: VAT Percentage and Currency */}
                <Col md="6">
                  <FormGroup>
                    <label className="form-label">
                      VAT Percentage <span className="text-danger">*</span>
                    </label>
                    <div className="form-control-wrap">
                      <div className="input-group">
                        <input
                          type="number"
                          className="form-control"
                          name="VATPercentage"
                          value={formData?.VATPercentage || ""}
                          onChange={(e) => {
                            const value = e.target.value === "" ? null : parseInt(e.target.value);
                            setFormData((prev) => ({ ...prev, VATPercentage: value }));
                            setValue("VATPercentage", value);
                            clearErrors("VATPercentage");
                          }}
                          placeholder="Enter VAT %"
                          min="0"
                          max="100"
                        />
                        <div className="input-group-append">
                          <span className="input-group-text">%</span>
                        </div>
                      </div>
                    </div>
                    {errors.VATPercentage && (
                      <span
                        className="invalid"
                        style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}
                      >
                        {errors.VATPercentage.message}
                      </span>
                    )}
                  </FormGroup>
                </Col>

                <Col md="6">
                  <FormGroup>
                    <label className="form-label">
                      Currency <span className="text-danger">*</span>
                    </label>
                    <div className="form-control-wrap">
                      <input
                        type="text"
                        className="form-control"
                        name="Currency"
                        value={formData?.Currency || ""}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, Currency: e.target.value }));
                          setValue("Currency", e.target.value);
                          clearErrors("Currency");
                        }}
                        placeholder="Enter currency (e.g., USD, INR, EUR)"
                      />
                    </div>
                    {errors.Currency && (
                      <span
                        className="invalid"
                        style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}
                      >
                        {errors.Currency.message}
                      </span>
                    )}
                  </FormGroup>
                </Col>

                {/* Row 3: Client GST and Client PAN */}
                <Col md="6">
                  <FormGroup>
                    <label className="form-label">
                      Client GST
                    </label>
                    <div className="form-control-wrap">
                      <input
                        type="text"
                        className="form-control"
                        name="ClientGST"
                        value={formData?.ClientGST || ""}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, ClientGST: e.target.value }));
                          setValue("ClientGST", e.target.value);
                        }}
                        placeholder="Enter Client GST Number"
                      />
                    </div>
                  </FormGroup>
                </Col>

                <Col md="6">
                  <FormGroup>
                    <label className="form-label">
                      Client PAN
                    </label>
                    <div className="form-control-wrap">
                      <input
                        type="text"
                        className="form-control"
                        name="ClientPAN"
                        value={formData?.ClientPAN || ""}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, ClientPAN: e.target.value }));
                          setValue("ClientPAN", e.target.value);
                        }}
                        placeholder="Enter Client PAN"
                      />
                    </div>
                  </FormGroup>
                </Col>

                {/* Row 4: Client GST State Code and Client Country Code */}
                <Col md="6">
                  <FormGroup>
                    <label className="form-label">
                      Client GST State Code
                    </label>
                    <div className="form-control-wrap">
                      <input
                        type="text"
                        className="form-control"
                        name="ClientGSTStateCode"
                        value={formData?.ClientGSTStateCode || ""}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, ClientGSTStateCode: e.target.value }));
                          setValue("ClientGSTStateCode", e.target.value);
                        }}
                        placeholder="Enter GST State Code"
                      />
                    </div>
                  </FormGroup>
                </Col>

                <Col md="6">
                  <FormGroup>
                    <label className="form-label">
                      Client Country Code
                    </label>
                    <div className="form-control-wrap">
                      <input
                        type="text"
                        className="form-control"
                        name="ClientCountryCode"
                        value={formData?.ClientCountryCode || ""}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, ClientCountryCode: e.target.value }));
                          setValue("ClientCountryCode", e.target.value);
                        }}
                        placeholder="Enter Country Code (e.g., IN, US)"
                      />
                    </div>
                  </FormGroup>
                </Col>
              </Row>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Row className="col-md-12">
            <Col size="6">
              <Button color="primary" type="submit" disabled={loading} onClick={handleSubmit(onFormSubmit)}>
                {loading ? (
                  <>
                    <Spinner size="sm" className="mr-1" /> <span>Mapping...</span>
                  </>
                ) : (
                  <>
                    <Icon className="plus" />
                    <span>Map Bank</span>
                  </>
                )}
              </Button>
            </Col>
            <Col sm="6">
              <Button
                onClick={(ev) => {
                  ev.preventDefault();
                  onFormCancel();
                }}
              >
                Cancel
              </Button>
            </Col>
          </Row>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default MapBankModal;

import React, { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Settings,
  MoreHorizontal,
  X,
  ChevronDown,
} from "lucide-react";
import "./Warehouses.css";

const warehouseData = [
  {
    id: 1,
    name: "London Warehouse",
    country: "England",
    address: "199 Bishopsgate, London",
    code: "#6H4G67",
  },
  {
    id: 2,
    name: "Boston Warehouse",
    country: "USA",
    address: "182/A Y-ra, Boston",
    code: "#2GB48K",
  },
  {
    id: 3,
    name: "Kualalampur Warehouse",
    country: "Malaysia",
    address: "Ipoh, Johor Bahru, Kualalampur",
    code: "#6L3G60",
  },
  {
    id: 4,
    name: "Chicago Warehouse",
    country: "Canada",
    address: "23/9 B/house, Chicago",
    code: "#9L4K67",
  },
  {
    id: 5,
    name: "London Warehouse",
    country: "England",
    address: "199 Bishopsgate, London",
    code: "#9K26GA",
  },
  {
    id: 6,
    name: "Mumbai Warehouse",
    country: "India",
    address: "Narottam Morarji Marg, Mumbai",
    code: "#6H4G67",
  },
  {
    id: 7,
    name: "Madrid Warehouse",
    country: "Spain",
    address: "Gran Via, Madrid.",
    code: "#6H4G67",
  },
  {
    id: 8,
    name: "Kualalampur Warehouse",
    country: "Malaysia",
    address: "Ipoh, Johor Bahru, Kualalampur",
    code: "#6L3G60",
  },
  {
    id: 9,
    name: "Chicago Warehouse",
    country: "Canada",
    address: "23/9 B/house, Chicago",
    code: "#9L4K67",
  },
  {
    id: 10,
    name: "Mumbai Warehouse",
    country: "India",
    address: "Narottam Morarji Marg, Mumbai",
    code: "#6H4G67",
  },
];

const Warehouses = () => {
  const [selectedWarehouses, setSelectedWarehouses] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  // Popup visibility
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);

  // Form fields
  const [warehouseName, setWarehouseName] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [warehouseCode, setWarehouseCode] = useState("");

  const itemsPerPage = 10;
  const totalPages = 102;

  const currentWarehouses = useMemo(() => {
    return warehouseData.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [currentPage]);

  // --------------------------------
  // SELECT ONE
  // --------------------------------
  const toggleWarehouse = (id) => {
    setSelectedWarehouses((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  };

  // --------------------------------
  // SELECT ALL
  // --------------------------------
  const toggleAll = () => {
    if (selectedWarehouses.length === currentWarehouses.length) {
      setSelectedWarehouses([]);
    } else {
      setSelectedWarehouses(
        currentWarehouses.map((warehouse) => warehouse.id)
      );
    }
  };

  // --------------------------------
  // OPEN POPUP
  // --------------------------------
  const handleAddWarehouseClick = () => {
    setShowAddWarehouse(true);
  };

  // --------------------------------
  // CLOSE POPUP
  // --------------------------------
  const handleClosePopup = () => {
    setShowAddWarehouse(false);
  };

  // --------------------------------
  // ADD WAREHOUSE
  // --------------------------------
  const handleSubmitWarehouse = (e) => {
    e.preventDefault();

    if (!warehouseName.trim()) {
      alert("Please enter Warehouse Name");
      return;
    }

    if (!country) {
      alert("Please select Country");
      return;
    }

    if (!address) {
      alert("Please select Warehouse Address");
      return;
    }

    if (!warehouseCode.trim()) {
      alert("Please enter Warehouse Code");
      return;
    }

    const newWarehouse = {
      warehouseName,
      country,
      address,
      warehouseCode,
    };

    console.log("New Warehouse:", newWarehouse);

    // Reset form
    setWarehouseName("");
    setCountry("");
    setAddress("");
    setWarehouseCode("");

    // Close popup
    setShowAddWarehouse(false);
  };

  return (
    <div className="warehouse-page">

      {/* =========================================
          PAGE HEADER
      ========================================== */}
      <div className="warehouse-header">
        <h1>Warehouses List</h1>

        <button
          type="button"
          className="add-warehouse-button"
          onClick={handleAddWarehouseClick}
        >
          <Plus size={17} />
          <span>Add Warehouse</span>
        </button>
      </div>

      {/* =========================================
          TABLE CARD
      ========================================== */}
      <div className="warehouse-card">

        {/* =========================================
            TABLE TOOLBAR
        ========================================== */}
        <div className="warehouse-toolbar">

          <div className="warehouse-bulk-actions">
            <button
              type="button"
              className="warehouse-bulk-button"
            >
              <span>Bulk Action</span>
              <ChevronDown size={14} />
            </button>

            <button
              type="button"
              className="warehouse-apply-button"
            >
              Apply
            </button>
          </div>

          <div className="warehouse-table-tools">
            <button type="button" className="warehouse-table-tool-button">
              <Search size={18} />
            </button>

            <button type="button" className="warehouse-table-tool-button">
              <Settings size={17} />
            </button>
          </div>

        </div>

        {/* =========================================
            TABLE
        ========================================== */}
        <div className="warehouse-table-responsive">
          <table className="warehouse-table">

            <thead>
              <tr>
                <th className="warehouse-checkbox-column">
                  <input
                    type="checkbox"
                    checked={
                      currentWarehouses.length > 0 &&
                      selectedWarehouses.length === currentWarehouses.length
                    }
                    onChange={toggleAll}
                  />
                </th>

                <th>Warehouse Name</th>
                <th>Country</th>
                <th>Address (Lane)</th>
                <th>Warehouse Code</th>

                <th className="warehouse-action-column">
                  <MoreHorizontal size={18} />
                </th>
              </tr>
            </thead>

            <tbody>
              {currentWarehouses.map((warehouse) => (
                <tr key={warehouse.id}>

                  <td className="warehouse-checkbox-column">
                    <input
                      type="checkbox"
                      checked={selectedWarehouses.includes(warehouse.id)}
                      onChange={() => toggleWarehouse(warehouse.id)}
                    />
                  </td>

                  <td className="warehouse-name">
                    {warehouse.name}
                  </td>

                  <td className="warehouse-link">
                    {warehouse.country}
                  </td>

                  <td className="warehouse-link">
                    {warehouse.address}
                  </td>

                  <td className="warehouse-link">
                    {warehouse.code}
                  </td>

                  <td className="warehouse-action-column">
                    <button
                      type="button"
                      className="warehouse-row-action"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>

          </table>
        </div>

        {/* =========================================
            FOOTER / PAGINATION
        ========================================== */}
        <div className="warehouse-footer">

          <div className="warehouse-pagination">

            <button
              type="button"
              className="warehouse-pagination-button"
              disabled={currentPage === 1}
              onClick={() =>
                setCurrentPage((page) => Math.max(page - 1, 1))
              }
            >
              Prev
            </button>

            <button
              type="button"
              className={`warehouse-pagination-number ${
                currentPage === 1 ? "active" : ""
              }`}
              onClick={() => setCurrentPage(1)}
            >
              1
            </button>

            <button
              type="button"
              className={`warehouse-pagination-number ${
                currentPage === 2 ? "active" : ""
              }`}
              onClick={() => setCurrentPage(2)}
            >
              2
            </button>

            <button
              type="button"
              className="warehouse-pagination-number dots"
            >
              ...
            </button>

            <button
              type="button"
              className={`warehouse-pagination-number ${
                currentPage === 6 ? "active" : ""
              }`}
              onClick={() => setCurrentPage(6)}
            >
              6
            </button>

            <button
              type="button"
              className={`warehouse-pagination-number ${
                currentPage === 7 ? "active" : ""
              }`}
              onClick={() => setCurrentPage(7)}
            >
              7
            </button>

            <button
              type="button"
              className="warehouse-pagination-button"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((page) =>
                  Math.min(page + 1, totalPages)
                )
              }
            >
              Next
            </button>

          </div>

          <div className="warehouse-page-info">
            <span>PAGE</span>

            <select
              value={currentPage}
              onChange={(e) =>
                setCurrentPage(Number(e.target.value))
              }
            >
              {Array.from(
                { length: totalPages },
                (_, index) => index + 1
              ).map((page) => (
                <option key={page} value={page}>
                  {page}
                </option>
              ))}
            </select>

            <span>OF {totalPages}</span>
          </div>

        </div>
      </div>

      {/* =================================================
          ADD WAREHOUSE POPUP
      ================================================== */}
      {showAddWarehouse && (
        <div
          className="warehouse-modal-overlay"
          onClick={handleClosePopup}
        >
          <div
            className="warehouse-modal"
            onClick={(e) => e.stopPropagation()}
          >

            {/* MODAL HEADER */}
            <div className="warehouse-modal-header">
              <h2>Add Warehouse</h2>

              <button
                type="button"
                className="warehouse-modal-close"
                onClick={handleClosePopup}
              >
                <X size={20} />
              </button>
            </div>

            {/* FORM */}
            <form
              onSubmit={handleSubmitWarehouse}
              className="warehouse-form"
            >

              {/* Warehouse Name */}
              <div className="warehouse-form-group">
                <label htmlFor="warehouseName">
                  Warehouse Name
                </label>

                <input
                  id="warehouseName"
                  type="text"
                  placeholder="eg. Dhaka Warehouse"
                  value={warehouseName}
                  onChange={(e) =>
                    setWarehouseName(e.target.value)
                  }
                />
              </div>

              {/* Country */}
              <div className="warehouse-form-group">
                <label htmlFor="country">
                  Country
                </label>

                <div className="warehouse-select-wrapper">
                  <select
                    id="country"
                    value={country}
                    onChange={(e) =>
                      setCountry(e.target.value)
                    }
                  >
                    <option value="">
                      Select Country
                    </option>

                    <option value="India">
                      India
                    </option>

                    <option value="USA">
                      USA
                    </option>

                    <option value="England">
                      England
                    </option>

                    <option value="Malaysia">
                      Malaysia
                    </option>

                    <option value="Canada">
                      Canada
                    </option>

                    <option value="Spain">
                      Spain
                    </option>
                  </select>

                  <ChevronDown
                    size={14}
                    className="select-icon"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="warehouse-form-group">
                <label htmlFor="address">
                  Address (Lane)
                </label>

                <div className="warehouse-select-wrapper">
                  <select
                    id="address"
                    value={address}
                    onChange={(e) =>
                      setAddress(e.target.value)
                    }
                  >
                    <option value="">
                      Select Warehouse address
                    </option>

                    <option value="199 Bishopsgate, London">
                      199 Bishopsgate, London
                    </option>

                    <option value="182/A Y-ra, Boston">
                      182/A Y-ra, Boston
                    </option>

                    <option value="Ipoh, Johor Bahru, Kualalampur">
                      Ipoh, Johor Bahru, Kualalampur
                    </option>

                    <option value="23/9 B/house, Chicago">
                      23/9 B/house, Chicago
                    </option>

                    <option value="Narottam Morarji Marg, Mumbai">
                      Narottam Morarji Marg, Mumbai
                    </option>

                    <option value="Gran Via, Madrid">
                      Gran Via, Madrid
                    </option>
                  </select>

                  <ChevronDown
                    size={14}
                    className="select-icon"
                  />
                </div>
              </div>

              {/* Warehouse Code */}
              <div className="warehouse-form-group">
                <label htmlFor="warehouseCode">
                  Warehouse Code
                </label>

                <input
                  id="warehouseCode"
                  type="text"
                  placeholder="eg. #6HJ459"
                  value={warehouseCode}
                  onChange={(e) =>
                    setWarehouseCode(e.target.value)
                  }
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="warehouse-submit-button"
              >
                Add Warehouse
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Warehouses;
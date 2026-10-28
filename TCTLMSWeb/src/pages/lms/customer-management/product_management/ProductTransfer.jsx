import React, { useState } from "react";
import { ChevronDown, Filter, Plus } from "lucide-react";
import "./ProductTransfer.css";

const ProductTransfer = () => {
  const [product, setProduct] = useState("Laptop");
  const [productType, setProductType] = useState("Technology");
  const [productBrand, setProductBrand] = useState("ASUS Zenbook");

  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");

  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");

  const handleSave = (e) => {
    e.preventDefault();

    const transferData = {
      product,
      productType,
      productBrand,
      quantity,
      price,
      transferFrom,
      transferTo,
    };

    console.log("Product Transfer:", transferData);

    alert("Product transfer information saved.");
  };

  const handleAddProduct = () => {
    alert("Add Product clicked");
  };

  return (
    <div className="product-transfer-page">

      {/* =========================
          HEADER
      ========================== */}
      <div className="product-transfer-header">
        <h1>Product Transfer</h1>

        <button
          type="button"
          className="product-transfer-filter-button"
        >
          <Filter size={14} />
          <span>Filtered By</span>
          <ChevronDown size={14} className="filter-arrow" />
        </button>
      </div>

      {/* =========================
          MAIN CARD
      ========================== */}
      <div className="product-transfer-card">

        <form onSubmit={handleSave}>

          {/* =========================
              PRODUCT DETAILS
          ========================== */}
          <section className="product-transfer-section">

            <h2>Product Details</h2>

            <div className="product-transfer-grid">

              {/* PRODUCT */}
              <div className="product-transfer-form-group">

                <label>Add Products</label>

                <div className="product-select-with-add">

                  <div className="product-transfer-select-wrapper">
                    <select
                      value={product}
                      onChange={(e) => setProduct(e.target.value)}
                    >
                      <option value="Laptop">Laptop</option>
                      <option value="Mobile">Mobile</option>
                      <option value="Desktop">Desktop</option>
                      <option value="Tablet">Tablet</option>
                      <option value="Monitor">Monitor</option>
                    </select>

                    <ChevronDown
                      size={13}
                      className="product-transfer-select-icon"
                    />
                  </div>

                  <button
                    type="button"
                    className="product-add-button"
                    onClick={handleAddProduct}
                    title="Add Product"
                  >
                    <Plus size={18} />
                  </button>

                </div>

              </div>

              {/* PRODUCT TYPE */}
              <div className="product-transfer-form-group">

                <label>Product Type</label>

                <div className="product-transfer-select-wrapper">

                  <select
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                  >
                    <option value="Technology">
                      Technology
                    </option>

                    <option value="Electronics">
                      Electronics
                    </option>

                    <option value="Furniture">
                      Furniture
                    </option>

                    <option value="Accessories">
                      Accessories
                    </option>
                  </select>

                  <ChevronDown
                    size={13}
                    className="product-transfer-select-icon"
                  />

                </div>

              </div>

              {/* PRODUCT BRAND */}
              <div className="product-transfer-form-group">

                <label>Product Brand</label>

                <div className="product-transfer-select-wrapper">

                  <select
                    value={productBrand}
                    onChange={(e) => setProductBrand(e.target.value)}
                  >
                    <option value="ASUS Zenbook">
                      ASUS Zenbook
                    </option>

                    <option value="Dell">
                      Dell
                    </option>

                    <option value="HP">
                      HP
                    </option>

                    <option value="Lenovo">
                      Lenovo
                    </option>

                    <option value="Apple">
                      Apple
                    </option>
                  </select>

                  <ChevronDown
                    size={13}
                    className="product-transfer-select-icon"
                  />

                </div>

              </div>

              {/* QUANTITY */}
              <div className="product-transfer-form-group">

                <label>Product Quantity</label>

                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 10"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />

              </div>

              {/* PRICE */}
              <div className="product-transfer-form-group">

                <label>Product Price</label>

                <input
                  type="text"
                  placeholder="e.g. $100.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />

              </div>

            </div>

          </section>

          {/* =========================
              WAREHOUSE ADDRESS
          ========================== */}
          <section className="warehouse-address-section">

            <h2>Warehouse Address</h2>

            <div className="product-transfer-grid warehouse-grid">

              {/* TRANSFER FROM */}
              <div className="product-transfer-form-group">

                <label>Transfer From (warehouse)</label>

                <div className="product-transfer-select-wrapper">

                  <select
                    value={transferFrom}
                    onChange={(e) =>
                      setTransferFrom(e.target.value)
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
                    size={13}
                    className="product-transfer-select-icon"
                  />

                </div>

              </div>

              {/* TRANSFER TO */}
              <div className="product-transfer-form-group">

                <label>Transfer To (warehouse)</label>

                <div className="product-transfer-select-wrapper">

                  <select
                    value={transferTo}
                    onChange={(e) =>
                      setTransferTo(e.target.value)
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
                    size={13}
                    className="product-transfer-select-icon"
                  />

                </div>

              </div>

            </div>

          </section>

          {/* =========================
              SAVE BUTTON
          ========================== */}
          <button
            type="submit"
            className="product-transfer-save-button"
          >
            Save Informations
          </button>

        </form>

      </div>
    </div>
  );
};

export default ProductTransfer;
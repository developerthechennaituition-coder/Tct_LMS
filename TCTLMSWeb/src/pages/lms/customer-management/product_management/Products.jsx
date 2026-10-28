import React, { useMemo, useState } from "react";
import {
  Plus,
  SlidersHorizontal,
  ChevronRight,
  MoreHorizontal,
  X,
} from "lucide-react";

import "./Products.css";

const productData = [
  {
    id: 1,
    name: "Laptop",
    code: "#6H4G67",
    thumbnail:
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=100",
    buyingPrice: 1000,
    sellingPrice: 800,
    category: "Electric",
    stock: 55,
    status: "Available",
    brand: "Samsung",
  },
  {
    id: 2,
    name: "Chair",
    code: "#8H4G65",
    thumbnail:
      "https://images.unsplash.com/photo-1503602642458-232111445657?w=100",
    buyingPrice: 620,
    sellingPrice: 600,
    category: "Furniture",
    stock: 0,
    status: "Out of Stock",
    brand: "Brompton",
  },
  {
    id: 3,
    name: "CPU Casing",
    code: "#6H4G67",
    thumbnail:
      "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=100",
    buyingPrice: 1000,
    sellingPrice: 700,
    category: "Electric",
    stock: 50,
    status: "Available",
    brand: "Gamemax Rockstar",
  },
  {
    id: 4,
    name: "Drone",
    code: "#2H4S60",
    thumbnail:
      "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=100",
    buyingPrice: 4000,
    sellingPrice: 350,
    category: "Electric",
    stock: 0,
    status: "Out of Stock",
    brand: "Quadcopter",
  },
  {
    id: 5,
    name: "Keyboard",
    code: "#9HTJ67",
    thumbnail:
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=100",
    buyingPrice: 150,
    sellingPrice: 120,
    category: "Electric",
    stock: 13,
    status: "Available",
    brand: "A4tech",
  },
  {
    id: 6,
    name: "Headset",
    code: "#4HIIG6K",
    thumbnail:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100",
    buyingPrice: 400,
    sellingPrice: 380,
    category: "Tools",
    stock: 0,
    status: "Out of Stock",
    brand: "ATH-G1WL",
  },
  {
    id: 7,
    name: "Phone",
    code: "#3H4J60",
    thumbnail:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100",
    buyingPrice: 350,
    sellingPrice: 320,
    category: "Electric",
    stock: 20,
    status: "Available",
    brand: "Xaomi",
  },
  {
    id: 8,
    name: "CPU Casing",
    code: "#6H4G67",
    thumbnail:
      "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=100",
    buyingPrice: 1000,
    sellingPrice: 700,
    category: "Electric",
    stock: 50,
    status: "Available",
    brand: "Gamemax Rockstar",
  },
  {
    id: 9,
    name: "Drone",
    code: "#2H4S60",
    thumbnail:
      "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=100",
    buyingPrice: 4000,
    sellingPrice: 350,
    category: "Electric",
    stock: 0,
    status: "Out of Stock",
    brand: "Quadcopter",
  },
  {
    id: 10,
    name: "Keyboard",
    code: "#9HTJ67",
    thumbnail:
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=100",
    buyingPrice: 150,
    sellingPrice: 120,
    category: "Electric",
    stock: 13,
    status: "Available",
    brand: "A4tech",
  },
];

const Products = () => {
  // =====================================================
  // TABLE STATE
  // =====================================================

  const [selectedProducts, setSelectedProducts] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  const totalPages = 102;

  // =====================================================
  // MODAL STATE
  // =====================================================

  const [showModal, setShowModal] = useState(false);

  // =====================================================
  // FORM STATE
  // =====================================================

  const [formData, setFormData] = useState({
    productName: "",
    productCode: "",
    thumbnail: null,
    buyingPrice: "",
    sellingPrice: "",
    category: "Electric",
    stock: "",
    brand: "",
  });

  // =====================================================
  // CURRENT PRODUCTS
  // =====================================================

  const currentProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = currentPage * itemsPerPage;

    return productData.slice(startIndex, endIndex);
  }, [currentPage]);

  // =====================================================
  // SELECT PRODUCT
  // =====================================================

  const toggleProduct = (id) => {
    setSelectedProducts((previous) => {
      if (previous.includes(id)) {
        return previous.filter((item) => item !== id);
      }

      return [...previous, id];
    });
  };

  // =====================================================
  // SELECT ALL
  // =====================================================

  const toggleAll = () => {
    const currentIds = currentProducts.map((product) => product.id);

    const allSelected = currentIds.every((id) =>
      selectedProducts.includes(id)
    );

    if (allSelected) {
      setSelectedProducts((previous) =>
        previous.filter((id) => !currentIds.includes(id))
      );
    } else {
      setSelectedProducts((previous) => [
        ...new Set([...previous, ...currentIds]),
      ]);
    }
  };

  // =====================================================
  // FORMAT PRICE
  // =====================================================

  const formatPrice = (price) => {
    return `$${price.toFixed(2)}`;
  };

  // =====================================================
  // OPEN MODAL
  // =====================================================

  const handleOpenModal = () => {
    setShowModal(true);
  };

  // =====================================================
  // CLOSE MODAL
  // =====================================================

  const handleCloseModal = () => {
    setShowModal(false);
  };

  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleInputChange = (event) => {
    const { name, value, files } = event.target;

    if (files) {
      setFormData((previous) => ({
        ...previous,
        [name]: files[0],
      }));

      return;
    }

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =====================================================
  // SUBMIT FORM
  // =====================================================

  const handleSubmit = (event) => {
    event.preventDefault();

    console.log("New Product:", formData);

    // API can be connected here later.

    setShowModal(false);

    setFormData({
      productName: "",
      productCode: "",
      thumbnail: null,
      buyingPrice: "",
      sellingPrice: "",
      category: "Electric",
      stock: "",
      brand: "",
    });
  };

  return (
    <div className="products-page">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="products-header">

        <div className="products-title-area">
          <h1>Products</h1>
        </div>

        <div className="products-header-actions">

          {/* FILTER BUTTON */}

          <button
            type="button"
            className="filter-button"
          >
            <SlidersHorizontal size={14} />

            <span>Filtered By</span>

            <ChevronRight size={14} />
          </button>

          {/* ADD PRODUCT BUTTON */}

          <button
            type="button"
            className="add-product-button"
            onClick={handleOpenModal}
          >
            <Plus size={16} />

            <span>Add Product</span>
          </button>

        </div>

      </div>


      {/* =================================================
          PRODUCT TABLE
      ================================================= */}

      <div className="products-table-wrapper">

        <table className="products-table">

          <thead>

            <tr>

              {/* CHECKBOX */}

              <th className="checkbox-column">

                <input
                  type="checkbox"
                  checked={
                    currentProducts.length > 0 &&
                    currentProducts.every((product) =>
                      selectedProducts.includes(product.id)
                    )
                  }
                  onChange={toggleAll}
                />

              </th>

              <th>Name</th>

              <th>Code</th>

              <th>Thumbnail</th>

              <th>Buying price</th>

              <th>Selling price</th>

              <th>Category</th>

              <th>Stock</th>

              <th>Status</th>

              <th>Brand</th>

              <th className="action-column">
                <MoreHorizontal size={16} />
              </th>

            </tr>

          </thead>


          <tbody>

            {currentProducts.map((product) => (

              <tr key={product.id}>

                {/* CHECKBOX */}

                <td className="checkbox-column">

                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => toggleProduct(product.id)}
                  />

                </td>


                {/* NAME */}

                <td className="product-name">
                  {product.name}
                </td>


                {/* CODE */}

                <td>

                  <span className="product-code">
                    {product.code}
                  </span>

                </td>


                {/* THUMBNAIL */}

                <td>

                  <div className="product-thumbnail">

                    <img
                      src={product.thumbnail}
                      alt={product.name}
                    />

                  </div>

                </td>


                {/* BUYING PRICE */}

                <td>
                  {formatPrice(product.buyingPrice)}
                </td>


                {/* SELLING PRICE */}

                <td>
                  {formatPrice(product.sellingPrice)}
                </td>


                {/* CATEGORY */}

                <td>
                  {product.category}
                </td>


                {/* STOCK */}

                <td>
                  {product.stock}
                </td>


                {/* STATUS */}

                <td>

                  <span
                    className={
                      product.status === "Available"
                        ? "status-badge available"
                        : "status-badge out-of-stock"
                    }
                  >
                    {product.status}
                  </span>

                </td>


                {/* BRAND */}

                <td>
                  {product.brand}
                </td>


                {/* ACTION */}

                <td className="action-column">

                  <button
                    type="button"
                    className="row-action"
                  >
                    <MoreHorizontal size={18} />
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>


      {/* =================================================
          PAGINATION
      ================================================= */}

      <div className="products-footer">

        <div className="pagination">

          {/* PREVIOUS */}

          <button
            type="button"
            className="pagination-button"
            disabled={currentPage === 1}
            onClick={() =>
              setCurrentPage((page) =>
                Math.max(page - 1, 1)
              )
            }
          >
            Prev
          </button>


          {/* PAGE 1 */}

          <button
            type="button"
            className={
              currentPage === 1
                ? "pagination-number active"
                : "pagination-number"
            }
            onClick={() => setCurrentPage(1)}
          >
            1
          </button>


          {/* PAGE 2 */}

          <button
            type="button"
            className={
              currentPage === 2
                ? "pagination-number active"
                : "pagination-number"
            }
            onClick={() => setCurrentPage(2)}
          >
            2
          </button>


          {/* DOTS */}

          <button
            type="button"
            className="pagination-number dots"
          >
            ...
          </button>


          {/* PAGE 6 */}

          <button
            type="button"
            className={
              currentPage === 6
                ? "pagination-number active"
                : "pagination-number"
            }
            onClick={() => setCurrentPage(6)}
          >
            6
          </button>


          {/* PAGE 7 */}

          <button
            type="button"
            className={
              currentPage === 7
                ? "pagination-number active"
                : "pagination-number"
            }
            onClick={() => setCurrentPage(7)}
          >
            7
          </button>


          {/* NEXT */}

          <button
            type="button"
            className="pagination-button"
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


        {/* PAGE INFORMATION */}

        <div className="page-info">

          <span>PAGE</span>

          <select
            value={currentPage}
            onChange={(event) =>
              setCurrentPage(Number(event.target.value))
            }
          >

            {Array.from(
              { length: totalPages },
              (_, index) => index + 1
            ).map((page) => (

              <option
                key={page}
                value={page}
              >
                {page}
              </option>

            ))}

          </select>

          <span>
            OF {totalPages}
          </span>

        </div>

      </div>


      {/* =================================================
          ADD PRODUCT MODAL
      ================================================= */}

      {showModal && (

        <div
          className="product-modal-overlay"
          onMouseDown={handleCloseModal}
        >

          <div
            className="product-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            {/* =============================================
                MODAL HEADER
            ============================================== */}

            <div className="product-modal-header">

              <h2>
                Add Product
              </h2>

              <button
                type="button"
                className="modal-close-button"
                onClick={handleCloseModal}
              >
                <X size={17} />
              </button>

            </div>


            {/* =============================================
                PRODUCT FORM
            ============================================== */}

            <form
              className="product-form"
              onSubmit={handleSubmit}
            >

              {/* =========================================
                  PRODUCT NAME / CODE
              ========================================== */}

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Product Name
                  </label>

                  <input
                    type="text"
                    name="productName"
                    value={formData.productName}
                    onChange={handleInputChange}
                    required
                  />

                </div>


                <div className="form-group">

                  <label>
                    Product Code
                  </label>

                  <input
                    type="text"
                    name="productCode"
                    value={formData.productCode}
                    onChange={handleInputChange}
                    required
                  />

                </div>

              </div>


              {/* =========================================
                  THUMBNAIL / BUYING PRICE
              ========================================== */}

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Upload Thumbnail
                  </label>

                  <div className="file-input-wrapper">

                    <div className="file-name">
                      {formData.thumbnail
                        ? formData.thumbnail.name
                        : "Choose file"}
                    </div>

                    <label className="browse-button">

                      Browse

                      <input
                        type="file"
                        name="thumbnail"
                        accept="image/*"
                        onChange={handleInputChange}
                      />

                    </label>

                  </div>

                </div>


                <div className="form-group">

                  <label>
                    Buying Price
                  </label>

                  <input
                    type="number"
                    name="buyingPrice"
                    value={formData.buyingPrice}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    required
                  />

                </div>

              </div>


              {/* =========================================
                  SELLING PRICE / CATEGORY
              ========================================== */}

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Selling Price
                  </label>

                  <input
                    type="number"
                    name="sellingPrice"
                    value={formData.sellingPrice}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    required
                  />

                </div>


                <div className="form-group">

                  <label>
                    Category
                  </label>

                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                  >

                    <option value="Electric">
                      Electric
                    </option>

                    <option value="Furniture">
                      Furniture
                    </option>

                    <option value="Tools">
                      Tools
                    </option>

                    <option value="Clothing">
                      Clothing
                    </option>

                    <option value="Mobile">
                      Mobile
                    </option>

                  </select>

                </div>

              </div>


              {/* =========================================
                  STOCK / BRAND
              ========================================== */}

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Stock
                  </label>

                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    min="0"
                    required
                  />

                </div>


                <div className="form-group">

                  <label>
                    Brand
                  </label>

                  <input
                    type="text"
                    name="brand"
                    value={formData.brand}
                    onChange={handleInputChange}
                    required
                  />

                </div>

              </div>


              {/* =========================================
                  SUBMIT
              ========================================== */}

              <div className="modal-footer">

                <button
                  type="submit"
                  className="submit-product-button"
                >
                  Add Product
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
};

export default Products;
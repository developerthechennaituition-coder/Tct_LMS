import React, { useState } from "react";

const AddCategoryModal = ({ onClose }) => {
  const [categoryName, setCategoryName] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState(null);
  const [subCategory, setSubCategory] = useState("");
  const [subCategories, setSubCategories] = useState([]);

  const handleAddSubCategory = () => {
    if (!subCategory.trim()) return;

    setSubCategories((previous) => [
      ...previous,
      subCategory.trim(),
    ]);

    setSubCategory("");
  };

  const handleSave = () => {
    const data = {
      categoryName,
      description,
      thumbnail,
      subCategories,
    };

    console.log("Category data:", data);

    onClose();
  };

  return (
    <div className="category-modal-overlay">
      <div className="category-modal">

        <div className="category-modal-header">
          <h2>Add Category</h2>

          <button
            className="modal-close-btn"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="form-group">
          <label>Category Name</label>

          <input
            type="text"
            placeholder="e.g. Web Development"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Description</label>

          <textarea
            placeholder="Write Category Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Category thumbnail</label>

          <div className="file-input-wrapper">
            <input
              type="text"
              value={thumbnail ? thumbnail.name : ""}
              placeholder="Choose file"
              readOnly
            />

            <label className="browse-btn">
              Browse

              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  setThumbnail(e.target.files[0]);
                }}
              />
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>Subcategory</label>

          <div className="subcategory-input">
            <input
              type="text"
              placeholder="e.g. Web Development"
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddSubCategory();
                }
              }}
            />

            <button
              type="button"
              onClick={handleAddSubCategory}
            >
              ＋
            </button>
          </div>

          {subCategories.length > 0 && (
            <div className="added-subcategories">
              {subCategories.map((item, index) => (
                <span key={index}>
                  {item}

                  <button
                    type="button"
                    onClick={() => {
                      setSubCategories((previous) =>
                        previous.filter(
                          (_, i) => i !== index
                        )
                      );
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          className="save-category-btn"
          onClick={handleSave}
        >
          Save Informations
        </button>

      </div>
    </div>
  );
};

export default AddCategoryModal;
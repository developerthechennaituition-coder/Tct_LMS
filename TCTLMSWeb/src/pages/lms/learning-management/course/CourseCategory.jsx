import React, { useState } from "react";
import { Link } from "react-router-dom";
import AddCategoryModal from "./components/AddCategoryModal";
import "./CourseCategory.css";

const CourseCategory = () => {
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [categories, setCategories] = useState([
    {
      id: 1,
      name: "Graphics Design",
      shortName: "GD",
      subCategories: 4,
      description:
        "Website Design & Develop the website with web applications",
      tags: [
        "Photoshop",
        "Adobe Illustrator",
        "Logo Design",
        "Drawing",
        "Figma",
      ],
    },
    {
      id: 2,
      name: "Web Development",
      shortName: "WD",
      subCategories: 5,
      description:
        "Website Design & Develop the website with web applications",
      tags: [
        "Responsive Design",
        "Wordpress Customization",
        "Theme Development",
        "Bootstrap",
        "HTML & CSS Grid",
      ],
    },
    {
      id: 3,
      name: "Mobile Application",
      shortName: "MA",
      subCategories: 4,
      description:
        "Website Design & Develop the website with web applications",
      tags: [
        "Mobile App Design",
        "User Interface",
        "Design Thinking",
        "Prototyping",
      ],
    },
    {
      id: 4,
      name: "Graphics Design",
      shortName: "GD",
      subCategories: 4,
      description:
        "Website Design & Develop the website with web applications",
      tags: [
        "Photoshop",
        "Adobe Illustrator",
        "Logo Design",
        "Drawing",
        "Figma",
      ],
    },
    {
      id: 5,
      name: "Web Development",
      shortName: "WD",
      subCategories: 5,
      description:
        "Website Design & Develop the website with web applications",
      tags: [
        "Responsive Design",
        "Wordpress Customization",
        "Theme Development",
        "Bootstrap",
        "HTML & CSS Grid",
      ],
    },
    {
      id: 6,
      name: "Mobile Application",
      shortName: "MA",
      subCategories: 4,
      description:
        "Website Design & Develop the website with web applications",
      tags: [
        "Mobile App Design",
        "User Interface",
        "Design Thinking",
        "Prototyping",
      ],
    },
    {
      id: 7,
      name: "Graphics Design",
      shortName: "GD",
      subCategories: 4,
      description:
        "Website Design & Develop the website with web applications",
      tags: [
        "Photoshop",
        "Adobe Illustrator",
        "Logo Design",
        "Drawing",
        "Figma",
      ],
    },
    {
      id: 8,
      name: "Web Development",
      shortName: "WD",
      subCategories: 5,
      description:
        "Website Design & Develop the website with web applications",
      tags: [
        "Responsive Design",
        "Wordpress Customization",
        "Theme Development",
        "Bootstrap",
        "HTML & CSS Grid",
      ],
    },
  ]);

  // =========================================
  // THREE DOT MENU
  // =========================================

  const handleMenuClick = (e, categoryId) => {
    e.preventDefault();
    e.stopPropagation();

    setOpenMenuId((currentId) =>
      currentId === categoryId ? null : categoryId
    );
  };

  // =========================================
  // EDIT
  // =========================================

  const handleEdit = (e, category) => {
    e.preventDefault();
    e.stopPropagation();

    setSelectedCategory(category);
    setOpenMenuId(null);
    setShowEditModal(true);
  };

  // =========================================
  // DELETE
  // =========================================

  const handleDelete = (e, categoryId) => {
    e.preventDefault();
    e.stopPropagation();

    setOpenMenuId(null);

    const confirmed = window.confirm(
      "Are you sure you want to delete this category?"
    );

    if (confirmed) {
      setCategories((currentCategories) =>
        currentCategories.filter(
          (category) => category.id !== categoryId
        )
      );
    }
  };

  // =========================================
  // SAVE EDIT
  // =========================================

  const handleSaveEdit = (updatedCategory) => {
    setCategories((currentCategories) =>
      currentCategories.map((category) =>
        category.id === updatedCategory.id
          ? updatedCategory
          : category
      )
    );

    setShowEditModal(false);
    setSelectedCategory(null);
  };

  return (
    <>
      <div
        className="course-category-page"
        onClick={() => setOpenMenuId(null)}
      >
        {/* Header */}

        <div className="course-category-header">
          <div>
            <h2>Course Category</h2>

            <p>
              You have total {categories.length} Categories
            </p>
          </div>

          <div className="course-category-actions">
            <button className="filter-btn">
              <span>☰</span>
              Filtered By
              <span>›</span>
            </button>

            <button
              className="add-category-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowModal(true);
              }}
            >
              <span>＋</span>
              Add Category
            </button>
          </div>
        </div>

        {/* Category Cards */}

        <div className="category-grid">
          {categories.map((category) => (
            <Link
              key={category.id}
              to="/learning-management/course/course-list"
              className="category-card-link"
            >
              <div className="category-card">

                {/* Card Header */}

                <div className="category-card-header">

                  <div className="category-title-section">
                    <div
                      className={`category-icon ${category.shortName}`}
                    >
                      {category.shortName}
                    </div>

                    <div>
                      <h3>{category.name}</h3>

                      <span>
                        {category.subCategories} SubCategories
                      </span>
                    </div>
                  </div>

                  {/* THREE DOT MENU */}

                  <div className="category-menu-wrapper">
                    <button
                      type="button"
                      className="category-menu-btn"
                      onClick={(e) =>
                        handleMenuClick(e, category.id)
                      }
                    >
                      •••
                    </button>

                    {/* DROPDOWN */}

                    {openMenuId === category.id && (
                      <div
                        className="category-dropdown"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <button
                          type="button"
                          className="category-dropdown-item"
                          onClick={(e) =>
                            handleEdit(e, category)
                          }
                        >
                          <span className="dropdown-icon edit-icon">
                            ✎
                          </span>

                          <span>Edit Category</span>
                        </button>

                        <button
                          type="button"
                          className="category-dropdown-item delete-item"
                          onClick={(e) =>
                            handleDelete(e, category.id)
                          }
                        >
                          <span className="dropdown-icon delete-icon">
                            ⊠
                          </span>

                          <span>Delete Category</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}

                <p className="category-description">
                  {category.description}
                </p>

                {/* Tags */}

                <div className="category-tags">
                  {category.tags.map((tag, index) => (
                    <span
                      className={`category-tag tag-${index % 5}`}
                      key={`${category.id}-${tag}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Add Category Modal */}

      {showModal && (
        <AddCategoryModal
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Edit Category Modal */}

      {showEditModal && selectedCategory && (
        <EditCategoryModal
          category={selectedCategory}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCategory(null);
          }}
          onSave={handleSaveEdit}
        />
      )}
    </>
  );
};


// =========================================================
// EDIT CATEGORY MODAL
// =========================================================

const EditCategoryModal = ({
  category,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(
    category.description
  );
  const [subCategories, setSubCategories] = useState(
    category.subCategories
  );

  const handleSubmit = (e) => {
    e.preventDefault();

    onSave({
      ...category,
      name,
      description,
      subCategories: Number(subCategories),
    });
  };

  return (
    <div
      className="category-modal-overlay"
      onClick={onClose}
    >
      <div
        className="category-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}

        <div className="category-modal-header">
          <h2>Edit Category</h2>

          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Form */}

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label>Category Name</label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>

            <textarea
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              required
            />
          </div>

          <div className="form-group">
            <label>SubCategories</label>

            <input
              type="number"
              min="0"
              value={subCategories}
              onChange={(e) =>
                setSubCategories(e.target.value)
              }
              required
            />
          </div>

          <button
            type="submit"
            className="save-category-btn"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
};

export default CourseCategory;
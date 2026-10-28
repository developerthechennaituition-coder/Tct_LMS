import React, { useState } from "react";
import { Pagination, PaginationLink, PaginationItem, Input, Button, Form, FormGroup } from "reactstrap";
import Icon from "../icon/Icon";

const PaginationComponent = ({ itemPerPage, totalItems, paginate, currentPage }) => {
  const [pageInput, setPageInput] = useState('');
  const pageNumbers = [];

  for (let i = 1; i <= Math.ceil(totalItems / itemPerPage); i++) {
    pageNumbers.push(i);
  }

  const nextPage = () => {
    paginate(currentPage + 1);
  };

  const prevPage = () => {
    paginate(currentPage - 1);
  };

  const handlePageInputChange = (e) => {
    setPageInput(e.target.value);
  };

  const goToPage = (e) => {
    e.preventDefault();
    const pageNum = parseInt(pageInput);
    if (pageNum > 0 && pageNum <= pageNumbers.length) {
      paginate(pageNum);
      setPageInput('');
    } else {
      alert(`Please enter a page number between 1 and ${pageNumbers.length}`);
    }
  };

  return (
    <div>
      <Pagination aria-label="Page navigation example">
        <PaginationItem disabled={currentPage - 1 === 0 ? true : false}>
          <PaginationLink
            className="page-link-prev"
            onClick={(ev) => {
              ev.preventDefault();
              prevPage();
            }}
            href="#prev"
          >
            <Icon name="chevrons-left" />
            <span>Previous</span>
          </PaginationLink>
        </PaginationItem>
        {pageNumbers.map((item) => {
          return (
            <PaginationItem className={currentPage === item ? "active" : ""} key={item}>
              <PaginationLink
                tag="a"
                href="#pageitem"
                onClick={(ev) => {
                  ev.preventDefault();
                  paginate(item);
                }}
              >
                {item}
              </PaginationLink>
            </PaginationItem>
          );
        })}

        <PaginationItem disabled={pageNumbers[pageNumbers.length - 1] === currentPage}>
          <PaginationLink
            className="page-link-next"
            onClick={(ev) => {
              ev.preventDefault();
              nextPage();
            }}
            href="#next"
          >
            <span>Next</span>
            <Icon name="chevrons-right" />
          </PaginationLink>
        </PaginationItem>
        <span style={{ paddingLeft: "10px" }}>
        <Form inline onSubmit={goToPage} className="d-flex align-items-center">
          <Input
            type="number"
            placeholder="Go to page"
            value={pageInput}
            onChange={handlePageInputChange}
            min="1"
            max={pageNumbers.length}
            className="mr-2"
            style={{ width: '100px' }}
          />
          <Button color="primary" type="submit">Go</Button>
        </Form>
        </span>
      </Pagination>
    </div>
  );
};

export default PaginationComponent;
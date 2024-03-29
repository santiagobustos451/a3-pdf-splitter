import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs';
import * as jspdfLib from "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

const {jsPDF} = window.jspdf;

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';

let fileInput = (() => {
    let inputEl;
    let viewer;
    let resultViewer;
    let pages = [];

    let init = () => {
        cacheDom();
        resetIframes();
        bindEvents();
    }
    let cacheDom = () => {
        inputEl = document.getElementById('input-pdf');
        viewer = document.getElementById('viewer');
        resultViewer = document.getElementById('result-viewer');
    }
    let bindEvents = () => {
        inputEl.addEventListener('change', loadFile);
    }
    let resetIframes = () => {
        viewer.src = 'about:blank';
        resultViewer.src = 'about:blank';
    }
    let loadFile = (e) => {

        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = function(event) {
            const fileContent = event.target.result;

            const blob = new Blob([fileContent], {type: 'application/pdf'});

            const url = URL.createObjectURL(blob);

            viewer.src = url;

            viewer.classList.remove('inactive');

            pdfjsLib.getDocument(url).promise.then(async pdf => {
                const totalPages = pdf.numPages;
      
                console.log(`The pdf has ${totalPages} pages.`);

                let pageLoads = [];

                for(let pageNumber = 1; pageNumber <= totalPages; pageNumber++){
                    pageLoads.push(pdf.getPage(pageNumber));
                    pdf.getPage(pageNumber).then(async page => {
                        const scale = 1.5;
                        const viewport = page.getViewport({scale});

                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;

                        const renderContext = {
                            canvasContext: context,
                            viewport: viewport,
                        };

                        await page.render(renderContext).promise.then(() => {
                            const pageData = canvas.toDataURL('image/png');
                            pages[pageNumber - 1] = (pageData);
                        })
                    })
                }

                setTimeout(() => {document.querySelector("#split-button").classList.remove('disabled');}, 1000)

                //put this in the correct place later
                inputEl.classList.add('loaded');
                //--------------------------
              });
        }

        reader.readAsArrayBuffer(file);
    }

    return {init, pages, viewer}
})();

let pageSplitter = (() => {
    let splitButton;
    let resultViewer;
    let loadingWheel;
    let outputPdf;
    let outputPages = [];

    let init = () => {
        cacheDom();
        bindEvents();
    }
    let cacheDom = () => {
        splitButton = document.getElementById('split-button');
        resultViewer = document.getElementById('result-viewer');
        loadingWheel = document.querySelector('.loading');
    }
    let bindEvents = () => {
        splitButton.addEventListener('click', splitPages);
    }
    let splitPages = async () => {
        outputPdf = new jsPDF({
            orientation: "landscape"
        });
        let pages = fileInput.pages;
        let imgLoads = [];

        resultViewer.src = 'about:blank'

        loadingWheel.classList.remove('inactive');

        pages.forEach(dataURL => {
            imgLoads.push(new Promise((resolve) => {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    const halfHeight = img.height / 2;
    
                    canvas.height = halfHeight;
                    canvas.width = img.width;
    
                    context.drawImage(img, 0, 0, img.width, halfHeight, 0, 0, img.width, halfHeight);
    
                    const topHalf = canvas.toDataURL('image/png');
    
                    context.drawImage(img, 0, halfHeight, img.width, halfHeight, 0, 0, img.width, halfHeight);
    
                    const bottomHalf = canvas.toDataURL('image/png');
    
                    outputPages.push(topHalf, bottomHalf);

                    resolve();
                }
    
                img.src = dataURL;
            }))
        })

        await Promise.all(imgLoads);

        outputPages.forEach(page => {
            addPageToPdf(page);
        });

        const blob = outputPdf.output('blob');

        resultViewer.src = URL.createObjectURL(blob);

        outputPages = [];
    }

    let addPageToPdf = (dataURL) => {
        const img = new Image();
        img.src = dataURL;
        outputPdf.addImage(img, 'PNG', 0, 0, outputPdf.internal.pageSize.getWidth(), outputPdf.internal.pageSize.getHeight())
        console.log(outputPages.indexOf(dataURL) !== outputPages.length - 1);
        if (outputPages.indexOf(dataURL) !== outputPages.length - 1) {
            outputPdf.addPage();
          }
    }

    return {init}
})()

fileInput.init();
pageSplitter.init();
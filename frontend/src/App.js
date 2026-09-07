import React, { useEffect, useMemo, useState, useCallback } from 'react';
import './App.css';
import Icon from './components/Icons';
import ToastContainer from './components/ToastContainer';
import ConfirmModal from './components/ConfirmModal';
import ReceiptModal from './components/ReceiptModal';
import AuthModal from './components/AuthModal';
import { initialProducts, initialJobs } from './utils/mockData';
import { getProductImage, getProductFallbackImage, getAvatarForName } from './utils/imageAssets';

const API_URL = process.env.REACT_APP_API_URL || (
  typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? '/api'
    : 'http://localhost:5000/api'
);

const navItems = [
  { id: 'pos', label: 'Point of Sale', shortLabel: 'POS', icon: 'pos', badge: 'Billing' },
  { id: 'jobs', label: 'Service Jobs', shortLabel: 'Jobs', icon: 'wrench', badge: 'Work Queue' },
  { id: 'stock', label: 'Inventory & Stock', shortLabel: 'Stock', icon: 'box', badge: 'Catalog' }
];

const money = (value) => `LKR ${Number(value || 0).toLocaleString('en-LK')}`;

function App() {
  // Global App States
  const [activeTab, setActiveTab] = useState('pos');
  const [theme, setTheme] = useState(() => localStorage.getItem('upgrade-hub-theme') || 'dark');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' }));
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');

  // Data Collections
  const [products, setProducts] = useState(initialProducts);
  const [jobs, setJobs] = useState(initialJobs);
  const [backendOnline, setBackendOnline] = useState(false);

  // Notifications State
  const [toasts, setToasts] = useState([]);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    details: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'primary',
    onConfirm: () => {}
  });

  // Receipt Modal State
  const [receiptData, setReceiptData] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Staff Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('upgrade-hub-user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // POS State
  const [posCategory, setPosCategory] = useState('All');
  const [posSearch, setPosSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [nameError, setNameError] = useState(false);
  const [phoneError, setPhoneError] = useState(false);
  const [cashError, setCashError] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [customDiscount, setCustomDiscount] = useState('');
  const [cashTendered, setCashTendered] = useState('');

  // Jobs State
  const [jobFilter, setJobFilter] = useState('All');
  const [jobSearch, setJobSearch] = useState('');
  const [jobCustName, setJobCustName] = useState('');
  const [jobCustPhone, setJobCustPhone] = useState('');
  const [jobServiceType, setJobServiceType] = useState('Mobile Repair');
  const [jobDevice, setJobDevice] = useState('');
  const [jobIssue, setJobIssue] = useState('');
  const [jobCost, setJobCost] = useState('');

  // Inventory State
  const [stockSearch, setStockSearch] = useState('');
  const [stockCategory, setStockCategory] = useState('All');
  const [prodName, setProdName] = useState('');
  const [prodCat, setProdCat] = useState('Mobile Accessory');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCost, setProdCost] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodImage, setProdImage] = useState('');

  // Toast Dispatcher
  const showToast = useCallback(({ type = 'info', title = '', message = '', duration = 4000 }) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    const newToast = { id, type, title, message, duration };
    setToasts((prev) => [...prev.slice(-3), newToast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Helper toast shortcuts
  const notify = useMemo(() => ({
    success: (msg, title = 'Success') => showToast({ type: 'success', title, message: msg }),
    error: (msg, title = 'Failed / Error') => showToast({ type: 'error', title, message: msg, duration: 5500 }),
    warning: (msg, title = 'Attention') => showToast({ type: 'warning', title, message: msg }),
    info: (msg, title = 'Information') => showToast({ type: 'info', title, message: msg })
  }), [showToast]);

  // Confirmation Helper (Replaces window.confirm)
  const requestConfirm = ({
    title,
    message,
    details = null,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'primary',
    onConfirm
  }) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      details,
      confirmText,
      cancelText,
      variant,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await onConfirm();
        } catch (err) {
          notify.error(err.message || 'Operation could not be completed.');
        }
      }
    });
  };

  // Live Clock Updater
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Theme Sync
  useEffect(() => {
    localStorage.setItem('upgrade-hub-theme', theme);
  }, [theme]);

  // Auth Token Verification & Session Check
  useEffect(() => {
    const token = localStorage.getItem('upgrade-hub-token');
    if (token) {
      fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Session expired');
        })
        .then((data) => {
          if (data && data.user) {
            setCurrentUser(data.user);
            localStorage.setItem('upgrade-hub-user', JSON.stringify(data.user));
          }
        })
        .catch(() => {
          localStorage.removeItem('upgrade-hub-token');
          localStorage.removeItem('upgrade-hub-user');
          setCurrentUser(null);
        });
    }
  }, []);

  // Close User Menu on Outside Click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.user-menu-wrapper')) {
        setIsUserMenuOpen(false);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleLogout = () => {
    const name = currentUser?.name;
    requestConfirm({
      title: 'Sign Out of Upgrade Hub?',
      message: 'Your current shop session will be closed on this device.',
      details: (
        <div className="confirm-session-details">
          <Icon name="user" size={16} />
          <span>Signed in as <strong>{name || 'Shop staff'}</strong></span>
        </div>
      ),
      confirmText: 'Yes, Sign Out',
      cancelText: 'Stay Signed In',
      variant: 'danger',
      onConfirm: () => {
        localStorage.removeItem('upgrade-hub-token');
        localStorage.removeItem('upgrade-hub-user');
        setCurrentUser(null);
        setIsUserMenuOpen(false);
        notify.info(`Signed out${name ? ` from ${name}` : ''}. You can sign in anytime.`, 'Session Closed');
      }
    });
  };

  // Load Data from Backend (with seamless local fallback)
  const loadData = useCallback(async () => {
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
      const [productsRes, jobsRes] = await Promise.all([
        fetch(`${API_URL}/products`, { signal: controller.signal }),
        fetch(`${API_URL}/jobs`, { signal: controller.signal })
      ]);
      clearTimeout(timeoutId);

      if (!productsRes.ok || !jobsRes.ok) throw new Error('API server returned error');

      const pData = await productsRes.json();
      const jData = await jobsRes.json();

      if (Array.isArray(pData) && pData.length > 0) setProducts(pData);
      if (Array.isArray(jData) && jData.length > 0) setJobs(jData);

      setBackendOnline(true);
      notify.success('Connected to Upgrade Hub backend server.', 'Database Online');
    } catch (err) {
      console.warn('Backend server offline or unreachable. Using interactive live demo mode.', err);
      setBackendOnline(false);
      // Fallback to rich initial mock dataset
      setProducts(initialProducts);
      setJobs(initialJobs);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // POS Calculations
  const cartSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.sellingPrice) * item.quantity, 0),
    [cart]
  );

  const calculatedDiscount = useMemo(() => {
    if (customDiscount && Number(customDiscount) > 0) {
      return Math.min(Number(customDiscount), cartSubtotal);
    }
    const percent = Number(discountPercent);
    if (percent > 0) {
      return (cartSubtotal * percent) / 100;
    }
    return 0;
  }, [cartSubtotal, discountPercent, customDiscount]);

  const cartTotal = Math.max(0, cartSubtotal - calculatedDiscount);
  const changeDue = cashTendered ? Math.max(0, Number(cashTendered) - cartTotal) : 0;

  // Filtered Products for POS
  const filteredPosProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = posCategory === 'All' || p.category === posCategory;
      const matchSearch = (p.name || '').toLowerCase().includes(posSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, posCategory, posSearch]);

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const matchFilter = jobFilter === 'All' || j.status === jobFilter;
      const matchSearch =
        (j.customerName || '').toLowerCase().includes(jobSearch.toLowerCase()) ||
        (j.deviceOrVehicle || '').toLowerCase().includes(jobSearch.toLowerCase()) ||
        (j.customerPhone || '').includes(jobSearch);
      return matchFilter && matchSearch;
    });
  }, [jobs, jobFilter, jobSearch]);

  // Filtered Stock Items
  const filteredStockProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = stockCategory === 'All' || p.category === stockCategory;
      const matchSearch = (p.name || '').toLowerCase().includes(stockSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, stockCategory, stockSearch]);

  // Metrics
  const lowStockCount = useMemo(() => products.filter((p) => p.stockQuantity < 5).length, [products]);
  const activeJobsCount = useMemo(() => jobs.filter((j) => j.status !== 'Delivered').length, [jobs]);
  const totalStockValuation = useMemo(
    () => products.reduce((sum, p) => sum + Number(p.sellingPrice) * Number(p.stockQuantity), 0),
    [products]
  );

  // Cart Operations
  const addToCart = (product) => {
    if (product.stockQuantity < 1) {
      notify.error(`"${product.name}" is currently out of stock!`, 'Out of Stock');
      return;
    }

    const existing = cart.find((item) => item._id === product._id);
    if (existing && existing.quantity >= product.stockQuantity) {
      notify.warning(`Maximum available stock (${product.stockQuantity}) already in cart.`, 'Stock Limit');
      return;
    }

    if (existing) {
      setCart(cart.map((item) => (item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item)));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    notify.info(`Added "${product.name}" to cart.`, 'Cart Updated');
  };

  const updateCartQuantity = (id, newQty) => {
    if (newQty <= 0) {
      setCart(cart.filter((item) => item._id !== id));
      notify.info('Item removed from cart.', 'Cart Updated');
      return;
    }

    const product = products.find((p) => p._id === id);
    if (product && newQty > product.stockQuantity) {
      notify.warning(`Only ${product.stockQuantity} units in stock.`, 'Stock Limit');
      return;
    }

    setCart(cart.map((item) => (item._id === id ? { ...item, quantity: newQty } : item)));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    requestConfirm({
      title: 'Clear Shopping Cart?',
      message: 'All items will be removed from your current sale order.',
      variant: 'danger',
      confirmText: 'Yes, Clear Cart',
      onConfirm: () => {
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setCustomDiscount('');
        setCashTendered('');
        setNameError(false);
        setPhoneError(false);
        setCashError(false);
        notify.info('Shopping cart cleared.', 'Cart Reset');
      }
    });
  };

  // Complete Sale Checkout
  const handleCheckout = () => {
    if (cart.length === 0) {
      notify.error('Please add at least one item before completing the sale.', 'Empty Cart');
      return;
    }

    // 1. Mandatory Customer Name
    const trimmedName = (customerName || '').trim();
    if (!trimmedName) {
      setNameError(true);
      notify.error('Please enter the customer name before completing the sale.', 'Customer Name Required');
      return;
    }

    // 2. Mandatory Customer Telephone
    const trimmedPhone = (customerPhone || '').trim();
    if (!trimmedPhone) {
      setPhoneError(true);
      notify.error('Please enter the customer telephone number.', 'Telephone Required');
      return;
    }

    // 3. Mandatory Cash Received Amount if Cash
    let tendered = 0;
    let change = 0;
    if (paymentMethod === 'Cash') {
      tendered = Number(cashTendered);
      if (!cashTendered || isNaN(tendered) || tendered <= 0) {
        setCashError(true);
        notify.error('Please enter the cash received amount from the customer.', 'Cash Received Required');
        return;
      }
      if (tendered < cartTotal) {
        setCashError(true);
        notify.error(
          `Cash received (${money(tendered)}) is less than total payable (${money(cartTotal)}). Short by ${money(cartTotal - tendered)}.`,
          'Insufficient Cash Received'
        );
        return;
      }
      change = tendered - cartTotal;
    }

    const saleDetails = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Customer Name:</span>
          <strong>{trimmedName}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Telephone:</span>
          <strong>{trimmedPhone}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Total Items:</span>
          <strong>{cart.reduce((s, i) => s + i.quantity, 0)} units</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Payment Method:</span>
          <strong>{paymentMethod}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6366f1', fontSize: '14px', marginTop: '4px' }}>
          <span>Net Payable:</span>
          <strong>{money(cartTotal)}</strong>
        </div>
        {paymentMethod === 'Cash' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontSize: '13px' }}>
              <span>Cash Received:</span>
              <strong>{money(tendered)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontSize: '13px' }}>
              <span>Change / Return:</span>
              <strong>{money(change)}</strong>
            </div>
          </>
        )}
      </div>
    );

    requestConfirm({
      title: 'Confirm Checkout & Payment',
      message: 'Complete this transaction and generate the official customer receipt?',
      details: saleDetails,
      confirmText: 'Complete & Print Receipt',
      variant: 'success',
      onConfirm: async () => {
        setBusyAction('checkout');
        try {
          if (backendOnline) {
            const response = await fetch(`${API_URL}/invoices`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customerName: trimmedName,
                customerPhone: trimmedPhone,
                items: cart.map((i) => ({
                  _id: i._id,
                  name: i.name,
                  category: i.category,
                  sellingPrice: Number(i.sellingPrice),
                  quantity: Number(i.quantity)
                })),
                totalAmount: cartTotal,
                paymentMethod: paymentMethod || 'Cash',
                cashTendered: paymentMethod === 'Cash' ? tendered : 0,
                changeDue: paymentMethod === 'Cash' ? change : 0
              })
            });

            if (!response.ok) {
              const errData = await response.json().catch(() => ({}));
              throw new Error(errData.error || `Checkout failed (${response.status})`);
            }
          }

          // Deduct stock in local state
          setProducts((prev) =>
            prev.map((p) => {
              const inCart = cart.find((item) => item._id === p._id || item.name === p.name);
              if (inCart) {
                return { ...p, stockQuantity: Math.max(0, p.stockQuantity - inCart.quantity) };
              }
              return p;
            })
          );

          // Generate Receipt Data
          const newReceipt = {
            id: `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
            date: new Date().toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' }),
            customerName: trimmedName,
            customerPhone: trimmedPhone,
            cashierName: currentUser ? `${currentUser.name} (${currentUser.role || 'Staff'})` : 'Chief Cashier (Staff)',
            items: cart.map((i) => ({ ...i, sellingPrice: Number(i.sellingPrice), quantity: Number(i.quantity) })),
            subtotal: cartSubtotal,
            discount: calculatedDiscount,
            total: cartTotal,
            paymentMethod: paymentMethod || 'Cash',
            cashTendered: paymentMethod === 'Cash' ? tendered : 0,
            changeDue: paymentMethod === 'Cash' ? change : 0
          };

          setReceiptData(newReceipt);
          setIsReceiptOpen(true);
          setCart([]);
          setCustomerName('');
          setCustomerPhone('');
          setCashTendered('');
          setCustomDiscount('');
          setNameError(false);
          setPhoneError(false);
          setCashError(false);
          notify.success(`Sale completed for ${money(cartTotal)}! Receipt ready to print.`, 'Transaction Successful');
        } catch (err) {
          console.error('Checkout error:', err);
          if (err.message && err.message.toLowerCase().includes('insufficient stock')) {
            notify.error(err.message, 'Insufficient Stock');
          } else {
            // Local fallback so sale is completed & receipt printed without blocking
            setProducts((prev) =>
              prev.map((p) => {
                const inCart = cart.find((item) => item._id === p._id || item.name === p.name);
                if (inCart) {
                  return { ...p, stockQuantity: Math.max(0, p.stockQuantity - inCart.quantity) };
                }
                return p;
              })
            );

            const newReceipt = {
              id: `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
              date: new Date().toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' }),
              customerName: trimmedName,
              customerPhone: trimmedPhone,
              cashierName: currentUser ? `${currentUser.name} (${currentUser.role || 'Staff'})` : 'Chief Cashier (Staff)',
              items: cart.map((i) => ({ ...i, sellingPrice: Number(i.sellingPrice), quantity: Number(i.quantity) })),
              subtotal: cartSubtotal,
              discount: calculatedDiscount,
              total: cartTotal,
              paymentMethod: paymentMethod || 'Cash',
              cashTendered: paymentMethod === 'Cash' ? tendered : 0,
              changeDue: paymentMethod === 'Cash' ? change : 0
            };

            setReceiptData(newReceipt);
            setIsReceiptOpen(true);
            setCart([]);
            setCustomerName('');
            setCustomerPhone('');
            setCashTendered('');
            setCustomDiscount('');
            setNameError(false);
            setPhoneError(false);
            setCashError(false);
            notify.warning(`${err.message}. Sale finalized with receipt.`, 'Sale Completed');
          }
        } finally {
          setBusyAction('');
        }
      }
    });
  };

  // Add Product to Inventory
  const handleAddProduct = (e) => {
    e.preventDefault();
    if (!prodName || !prodPrice || !prodStock) {
      notify.error('Please fill in Item Name, Selling Price, and Stock Quantity.', 'Incomplete Form');
      return;
    }

    const priceNum = Number(prodPrice);
    const costNum = prodCost ? Number(prodCost) : 0;
    const stockNum = Number(prodStock);
    const profitMargin = costNum > 0 ? (((priceNum - costNum) / costNum) * 100).toFixed(0) : null;

    const prodDetails = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Item Name:</span>
          <strong>{prodName}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Category:</span>
          <strong>{prodCat}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Selling Price:</span>
          <strong>{money(priceNum)}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Stock to Add:</span>
          <strong>{stockNum} units</strong>
        </div>
        {profitMargin && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
            <span>Estimated Profit Margin:</span>
            <strong>+{profitMargin}%</strong>
          </div>
        )}
      </div>
    );

    requestConfirm({
      title: 'Add New Product to Inventory?',
      message: 'This item will immediately be available in Point of Sale and Inventory overview.',
      details: prodDetails,
      variant: 'primary',
      confirmText: 'Save Product',
      onConfirm: async () => {
        setBusyAction('product');
        try {
          let newProductObj = {
            _id: `prod-${Date.now()}`,
            name: prodName,
            category: prodCat,
            sellingPrice: priceNum,
            costPrice: costNum,
            stockQuantity: stockNum,
            imageUrl: prodImage.trim() || undefined
          };

          if (backendOnline) {
            const res = await fetch(`${API_URL}/products`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: prodName,
                category: prodCat,
                sellingPrice: priceNum,
                stockQuantity: stockNum
              })
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.error || 'Failed to save product on server');
            }
            const saved = await res.json();
            newProductObj = { ...newProductObj, ...saved };
          }

          setProducts((prev) => [newProductObj, ...prev]);
          setProdName('');
          setProdPrice('');
          setProdCost('');
          setProdStock('');
          setProdImage('');
          notify.success(`"${newProductObj.name}" added to inventory successfully!`, 'Item Cataloged');
        } catch (err) {
          notify.error(err.message || 'Could not save product.', 'Save Error');
        } finally {
          setBusyAction('');
        }
      }
    });
  };

  // Adjust Stock Quick Control (+1 / -1)
  const adjustStock = (id, delta) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p._id === id) {
          const updated = Math.max(0, p.stockQuantity + delta);
          return { ...p, stockQuantity: updated };
        }
        return p;
      })
    );
    notify.info(delta > 0 ? 'Stock replenished (+1 unit).' : 'Stock decreased (-1 unit).', 'Stock Adjusted');
  };

  // Sync Official Sri Lankan Catalog (44 Items)
  const handleResetCatalog = () => {
    requestConfirm({
      title: 'Sync Sri Lankan Catalog?',
      message: 'This will synchronize all 44 official Sri Lankan Three-Wheeler modification, audio setup, and mobile spare items into the active catalog.',
      variant: 'primary',
      confirmText: 'Sync 44 Items',
      onConfirm: async () => {
        setBusyAction('catalog');
        try {
          if (backendOnline) {
            const res = await fetch(`${API_URL}/products/reset`, { method: 'POST' });
            if (!res.ok) throw new Error('Database sync failed');
            const data = await res.json();
            if (data.products && Array.isArray(data.products)) {
              setProducts(data.products);
            } else {
              await loadData();
            }
          } else {
            setProducts(initialProducts);
          }
          notify.success('Catalog synchronized! All 44 Sri Lankan Three-Wheeler & Mobile items active.', 'Catalog Updated');
        } catch (err) {
          notify.error(err.message || 'Could not sync catalog.', 'Sync Error');
        } finally {
          setBusyAction('');
        }
      }
    });
  };

  // Create Service Job Card
  const handleCreateJob = (e) => {
    e.preventDefault();
    if (!jobCustName || !jobCustPhone || !jobDevice || !jobIssue) {
      notify.error('Please provide customer name, contact phone, device/vehicle, and issue description.', 'Missing Fields');
      return;
    }

    const jobDetails = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Customer:</span>
          <strong>{jobCustName} ({jobCustPhone})</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Service Type:</span>
          <strong>{jobServiceType}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Device / 3W:</span>
          <strong>{jobDevice}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Estimated Cost:</span>
          <strong>{jobCost ? money(Number(jobCost)) : 'To be estimated'}</strong>
        </div>
      </div>
    );

    requestConfirm({
      title: 'Create Service Job Card?',
      message: 'Register this job card into the shop workshop queue.',
      details: jobDetails,
      variant: 'primary',
      confirmText: 'Create Job Card',
      onConfirm: async () => {
        setBusyAction('job');
        try {
          let newJobObj = {
            _id: `job-${Date.now()}`,
            customerName: jobCustName,
            customerPhone: jobCustPhone,
            serviceType: jobServiceType,
            deviceOrVehicle: jobDevice,
            issueDetails: jobIssue,
            estimatedCost: Number(jobCost || 0),
            status: 'Received',
            createdAt: new Date().toISOString()
          };

          if (backendOnline) {
            const res = await fetch(`${API_URL}/jobs`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customerName: jobCustName,
                customerPhone: jobCustPhone,
                serviceType: jobServiceType,
                deviceOrVehicle: jobDevice,
                issueDetails: jobIssue,
                estimatedCost: Number(jobCost || 0)
              })
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.error || 'Failed to create job card on server');
            }
            const saved = await res.json();
            newJobObj = { ...newJobObj, ...saved };
          }

          setJobs((prev) => [newJobObj, ...prev]);
          setJobCustName('');
          setJobCustPhone('');
          setJobDevice('');
          setJobIssue('');
          setJobCost('');
          notify.success(`Job Card for ${newJobObj.customerName} created! Status: Received`, 'Job Scheduled');
        } catch (err) {
          notify.error(err.message || 'Failed to create job card.', 'Job Card Error');
        } finally {
          setBusyAction('');
        }
      }
    });
  };

  // Update Job Status with Confirmation
  const updateJobStatus = (id, newStatus) => {
    const job = jobs.find((j) => j._id === id);
    if (!job) return;

    requestConfirm({
      title: `Update Job Status to "${newStatus}"?`,
      message: `Advance service job for "${job.customerName}" (${job.deviceOrVehicle}) to ${newStatus}.`,
      variant: newStatus === 'Delivered' ? 'success' : 'primary',
      confirmText: `Set as ${newStatus}`,
      onConfirm: async () => {
        setBusyAction(`status-${id}`);
        try {
          if (backendOnline) {
            const res = await fetch(`${API_URL}/jobs/${id}/status`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: newStatus })
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.error || 'Failed to update job status on server');
            }
          }

          setJobs((prev) =>
            prev.map((j) => (j._id === id ? { ...j, status: newStatus } : j))
          );
          notify.success(`Job #${id.slice(-4)} moved to "${newStatus}"!`, 'Status Updated');
        } catch (err) {
          notify.error(err.message || 'Status update failed.', 'Update Error');
        } finally {
          setBusyAction('');
        }
      }
    });
  };

  // Print Official Service Invoice for a Job
  const handlePrintJobReceipt = (job) => {
    const jobInvoice = {
      id: `SRV-${new Date().getFullYear()}-${job._id ? String(job._id).slice(-5).toUpperCase() : Date.now().toString().slice(-5)}`,
      date: new Date().toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' }),
      customerName: job.customerName || 'Walk-in Customer',
      customerPhone: job.customerPhone || '',
      cashierName: 'Service Desk #01',
      items: [
        {
          name: `${job.serviceType}: ${job.deviceOrVehicle} - ${job.issueDescription}`,
          category: job.serviceType,
          sellingPrice: Number(job.estimatedCost || 0),
          quantity: 1,
          warranty: (job.serviceType || '').toLowerCase().includes('modification') ? '6 Months Workmanship' : '3 Months Service'
        }
      ],
      subtotal: Number(job.estimatedCost || 0),
      discount: 0,
      total: Number(job.estimatedCost || 0),
      paymentMethod: 'Cash Settlement',
      cashTendered: Number(job.estimatedCost || 0),
      changeDue: 0
    };
    setReceiptData(jobInvoice);
    setIsReceiptOpen(true);
  };

  // Enforce Login Gate: App starts from the dedicated larger Login Screen if not authenticated
  if (!currentUser) {
    return (
      <div className={`app-shell theme-${theme}`}>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <AuthModal
          isOpen={true}
          isFullScreen={true}
          theme={theme}
          onToggleTheme={() => {
            const next = theme === 'light' ? 'dark' : 'light';
            setTheme(next);
            notify.info(`Switched to ${next === 'dark' ? 'Dark' : 'Light'} Mode`, 'Theme Changed');
          }}
          onAuthSuccess={({ user }) => {
            setCurrentUser(user);
          }}
          notify={notify}
          apiUrl={API_URL}
        />
      </div>
    );
  }

  return (
    <div className={`app-shell theme-${theme}`}>
      {/* Multi-Toast Floating Notifications Stack */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Accessible Confirmation Modal Dialog */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        details={confirmModal.details}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        busy={!!busyAction}
      />

      {/* Printable Digital Receipt / Invoice Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        saleData={receiptData}
        onClose={() => setIsReceiptOpen(false)}
      />

      {/* Staff Authentication Modal (Login & Signup) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={({ user }) => {
          setCurrentUser(user);
          setIsUserMenuOpen(false);
        }}
        notify={notify}
        apiUrl={API_URL}
      />

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark-logo">
            <img
              src="/shop-mark.png"
              alt="Upgrade Hub Emblem"
              className="brand-logo-mark"
            />
          </div>
          <div>
            <div className="brand-name">Upgrade Hub</div>
            <div className="brand-tagline">Mobile & 3W Mod Center</div>
          </div>
        </div>

        <div className="sidebar-banner-wrap">
          <img
            src="/shop-logo-transparent.png"
            alt="Upgrade Hub Official"
            className="sidebar-banner-img"
          />
        </div>

        <div className="sidebar-section-title">Navigation</div>
        <nav className="nav-list">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <div className="nav-icon">
                  <Icon name={item.icon} size={16} />
                </div>
                <span>{item.label}</span>
                {item.id === 'pos' && cart.length > 0 && (
                  <span className="nav-badge">{cart.length}</span>
                )}
                {item.id === 'jobs' && activeJobsCount > 0 && (
                  <span className="nav-badge">{activeJobsCount}</span>
                )}
                {item.id === 'stock' && lowStockCount > 0 && (
                  <span className="nav-badge" style={{ background: '#f59e0b' }}>{lowStockCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="status-indicator">
            <div className="status-pulse-dot" style={{ background: backendOnline ? '#10b981' : '#f59e0b' }} />
            <span>{backendOnline ? 'Cloud Database Live' : 'Offline Mode'}</span>
          </div>

          <button
            className="theme-toggle-btn"
            onClick={() => {
              const next = theme === 'light' ? 'dark' : 'light';
              setTheme(next);
              notify.info(`Switched to ${next === 'dark' ? 'Dark' : 'Light'} Mode`, 'Theme Changed');
            }}
            title="Toggle Light / Dark Mode"
          >
            <span>{theme === 'light' ? 'Switch to Dark' : 'Switch to Light'}</span>
            <div className="theme-switch-icon">
              <Icon name={theme === 'light' ? 'moon' : 'sun'} size={15} />
            </div>
          </button>

          <div className="sidebar-dev-attribution">
            <img
              src="/hasaranga.jpg"
              alt="Hasaranga Abeyrathna"
              className="sidebar-dev-avatar"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div className="sidebar-dev-info">
              <div className="sidebar-dev-title">System Architecture</div>
              <div className="sidebar-dev-name">Hasaranga Abeyrathna</div>
              <div className="sidebar-dev-badge">Senior Software Engineer · SLIIT</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Topbar Header */}
        <header className="topbar">
          <div className="topbar-titles">
            <div className="topbar-brand-row">
              <div className="topbar-eyebrow">
                <Icon name="sparkles" size={14} />
                <span>UPGRADE HUB CONTROL CENTER</span>
              </div>
            </div>
            <h1>{navItems.find((i) => i.id === activeTab)?.label}</h1>
          </div>

          <div className="topbar-actions">
            <div className="live-clock-badge">
              <Icon name="clock" size={14} />
              <span>Open Today · <strong>{currentTime}</strong></span>
            </div>

            <button
              className="icon-btn-action"
              onClick={loadData}
              title="Refresh data from server"
            >
              <Icon name="refresh" size={16} />
            </button>

            <button
              className="icon-btn-action"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              title="Toggle theme"
            >
              <Icon name={theme === 'light' ? 'moon' : 'sun'} size={16} />
            </button>

            {currentUser ? (
              <div className="user-menu-wrapper">
                <button
                  type="button"
                  className="user-profile-badge user-profile-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsUserMenuOpen(!isUserMenuOpen);
                  }}
                  title="Staff Profile & Actions"
                >
                  <img
                    src={currentUser.avatar || getAvatarForName(currentUser.name)}
                    alt={currentUser.name}
                    className="user-avatar"
                  />
                  <div className="user-text-meta">
                    <span className="user-name">{currentUser.name}</span>
                    <span className={`user-role-badge role-${(currentUser.role || 'cashier').toLowerCase()}`}>
                      {currentUser.role || 'Cashier'}
                    </span>
                  </div>
                  <Icon name="chevronDown" size={14} className={`user-chevron ${isUserMenuOpen ? 'open' : ''}`} />
                </button>

                {isUserMenuOpen && (
                  <div className="user-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                    <div className="user-dropdown-header">
                      <div className="dropdown-user-name">{currentUser.name}</div>
                      <div className="dropdown-user-email">{currentUser.email}</div>
                      <span className={`user-role-badge role-${(currentUser.role || 'cashier').toLowerCase()}`}>
                        {currentUser.role || 'Staff Member'}
                      </span>
                    </div>
                    <div className="user-dropdown-divider" />
                    <button
                      type="button"
                      className="user-dropdown-item"
                      onClick={() => {
                        requestConfirm({
                          title: 'Switch Staff Account?',
                          message: 'The current account will remain signed out until another staff member signs in.',
                          confirmText: 'Continue to Sign In',
                          cancelText: 'Cancel',
                          variant: 'primary',
                          onConfirm: () => {
                            setIsUserMenuOpen(false);
                            setIsAuthModalOpen(true);
                          }
                        });
                      }}
                    >
                      <Icon name="user" size={15} />
                      <span>Switch Account / Sign In</span>
                    </button>
                    <button
                      type="button"
                      className="user-dropdown-item item-logout"
                      onClick={handleLogout}
                    >
                      <Icon name="close" size={15} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="topbar-login-btn"
                onClick={() => setIsAuthModalOpen(true)}
                title="Sign In with Staff Account"
              >
                <Icon name="user" size={15} />
                <span>Staff Sign In</span>
              </button>
            )}
          </div>
        </header>

        {/* Real-Time Metrics Banner */}
        <section className="metrics-banner">
          <div className="metric-card">
            <div className="metric-icon-bubble metric-purple">
              <Icon name="dollar" size={22} />
            </div>
            <div className="metric-info">
              <div className="metric-label">Today's Revenue</div>
              <div className="metric-value">{money(0)}</div>
              <div className="metric-caption positive">
                <Icon name="trendingUp" size={13} />
                <span>Ready for billing</span>
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon-bubble metric-amber">
              <Icon name="wrench" size={22} />
            </div>
            <div className="metric-info">
              <div className="metric-label">Active Workshop Jobs</div>
              <div className="metric-value">{activeJobsCount}</div>
              <div className="metric-caption">
                <span>In progress & ready for pickup</span>
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon-bubble metric-cyan">
              <Icon name="box" size={22} />
            </div>
            <div className="metric-info">
              <div className="metric-label">Stock Valuation</div>
              <div className="metric-value">{money(totalStockValuation)}</div>
              <div className="metric-caption">
                <span>{products.length} products listed</span>
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon-bubble metric-emerald">
              <Icon name="alert" size={22} />
            </div>
            <div className="metric-info">
              <div className="metric-label">Stock Health</div>
              <div className="metric-value">{lowStockCount}</div>
              <div className={`metric-caption ${lowStockCount > 0 ? 'warning' : 'positive'}`}>
                <span>{lowStockCount > 0 ? 'Items below 5 units' : 'All stock levels optimal'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Tab 1: Point of Sale (POS) */}
        {activeTab === 'pos' && (
          <div className="pos-layout">
            {/* Catalog Section */}
            <section className="panel catalog-section">
              <div className="panel-header">
                <div className="panel-title">
                  <p className="panel-eyebrow">FAST CATALOG</p>
                  <h2>Select Items to Bill</h2>
                </div>

                <div className="search-input-group">
                  <span className="search-icon"><Icon name="search" size={15} /></span>
                  <input
                    type="text"
                    placeholder="Search items by name..."
                    value={posSearch}
                    onChange={(e) => setPosSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="pos-category-bar">
                {[
                  { id: 'All', label: 'All Items' },
                  { id: '3W Mod Part', label: '3W Mod & Audio' },
                  { id: 'Mobile Accessory', label: 'Mobile Accessories' },
                  { id: 'Mobile Part', label: 'Mobile Spare Parts' }
                ].map((cat) => {
                  const count = cat.id === 'All' ? products.length : products.filter((p) => p.category === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      className={`category-pill ${posCategory === cat.id ? 'active' : ''}`}
                      onClick={() => setPosCategory(cat.id)}
                    >
                      <span>{cat.label}</span>
                      <span className="category-pill-count">{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Product Cards Grid with Online Images */}
              {loading ? (
                <div className="cart-empty-state">
                  <Icon name="refresh" size={32} className="spin" />
                  <p>Loading catalog items...</p>
                </div>
              ) : filteredPosProducts.length === 0 ? (
                <div className="cart-empty-state">
                  <div className="cart-empty-icon">
                    <Icon name="box" size={24} />
                  </div>
                  <strong>No items found</strong>
                  <p>Try searching for a different keyword or category.</p>
                </div>
              ) : (
                <div className="catalog-grid">
                  {filteredPosProducts.map((product) => {
                    const isSoldOut = product.stockQuantity < 1;
                    const isLowStock = product.stockQuantity > 0 && product.stockQuantity < 5;
                    const imgUrl = getProductImage(product);

                    return (
                      <button
                        key={product._id}
                        className="product-card"
                        disabled={isSoldOut}
                        onClick={() => addToCart(product)}
                        title={isSoldOut ? 'Sold out' : `Add ${product.name} to cart`}
                      >
                        <div className="product-card-thumb">
                          <img
                            src={imgUrl}
                            alt={product.name}
                            loading="lazy"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = getProductFallbackImage(product);
                            }}
                          />
                          <span className={`stock-tag ${isSoldOut ? 'stock-out' : isLowStock ? 'stock-low' : 'stock-in'}`}>
                            {isSoldOut ? 'Sold Out' : isLowStock ? `${product.stockQuantity} Left` : `${product.stockQuantity} In Stock`}
                          </span>
                        </div>

                        <div className="product-card-body">
                          <span className="product-category-label">{product.category}</span>
                          <h3 className="product-name">{product.name}</h3>
                          <div className="product-card-footer">
                            <span className="product-price">{money(product.sellingPrice)}</span>
                            <div className="btn-add-cart">
                              <Icon name="plus" size={16} />
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Current Order / Cart Panel */}
            <aside className="panel cart-panel">
              <div className="panel-header">
                <div className="panel-title">
                  <p className="panel-eyebrow">ORDER SUMMARY</p>
                  <h2>Current Cart</h2>
                </div>
                {cart.length > 0 && (
                  <button className="btn-clear-cart" onClick={handleClearCart}>
                    <Icon name="trash" size={13} />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Customer Identification Section */}
              <div className="cart-customer-section">
                <div className="cart-field-row">
                  <div className="cart-field-col">
                    <label className="cart-field-label">
                      <Icon name="user" size={12} />
                      <span>Customer Name <span className="req-star">*</span></span>
                    </label>
                    <input
                      type="text"
                      className={`customer-input-field ${nameError ? 'input-invalid' : ''}`}
                      placeholder="e.g. Kasun Bandara"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (nameError) setNameError(false);
                      }}
                      title="Customer Name (Required)"
                    />
                  </div>
                  <div className="cart-field-col">
                    <label className="cart-field-label">
                      <Icon name="phone" size={12} />
                      <span>Telephone <span className="req-star">*</span></span>
                    </label>
                    <input
                      type="tel"
                      className={`customer-input-field ${phoneError ? 'input-invalid' : ''}`}
                      placeholder="e.g. 077 452 9811"
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        if (phoneError) setPhoneError(false);
                      }}
                      title="Customer Telephone (Required)"
                    />
                  </div>
                </div>
              </div>

              {/* Cart Items List */}
              {cart.length === 0 ? (
                <div className="cart-empty-state">
                  <div className="cart-empty-icon">
                    <Icon name="cart" size={24} />
                  </div>
                  <strong>Cart is currently empty</strong>
                  <p>Click on any catalog product to begin adding items to this sale.</p>
                </div>
              ) : (
                <div className="cart-item-list">
                  {cart.map((item) => (
                    <div className="cart-item-card" key={item._id}>
                      <img
                        src={getProductImage(item)}
                        alt={item.name}
                        className="cart-item-thumb"
                      />
                      <div className="cart-item-details">
                        <strong>{item.name}</strong>
                        <small>{money(item.sellingPrice)} each</small>
                      </div>

                      <div className="cart-item-actions">
                        <div className="cart-quantity-stepper">
                          <button
                            onClick={() => updateCartQuantity(item._id, item.quantity - 1)}
                            title="Decrease quantity"
                          >
                            -
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item._id, item.quantity + 1)}
                            title="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <span className="cart-item-total">{money(item.sellingPrice * item.quantity)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Payment Mode Selector */}
              <div className="payment-mode-selector">
                {['Cash', 'Card', 'Bank Transfer'].map((mode) => (
                  <button
                    key={mode}
                    className={`payment-mode-btn ${paymentMethod === mode ? 'active' : ''}`}
                    onClick={() => setPaymentMethod(mode)}
                  >
                    <Icon name={mode === 'Cash' ? 'dollar' : mode === 'Card' ? 'creditCard' : 'arrowRight'} size={16} />
                    <span>{mode}</span>
                  </button>
                ))}
              </div>

              {/* Discount Options */}
              <div className="discount-bar">
                <select
                  value={discountPercent}
                  onChange={(e) => {
                    setDiscountPercent(e.target.value);
                    setCustomDiscount('');
                  }}
                  title="Discount preset"
                >
                  <option value="0">0% Discount</option>
                  <option value="5">5% Off</option>
                  <option value="10">10% Off</option>
                  <option value="15">15% Off</option>
                </select>
                <input
                  type="number"
                  placeholder="Custom LKR"
                  value={customDiscount}
                  onChange={(e) => {
                    setCustomDiscount(e.target.value);
                    setDiscountPercent('0');
                  }}
                />
              </div>

              {/* Cart Summary Breakdown */}
              <div className="cart-bill-summary">
                <div className="cart-bill-row">
                  <span>Subtotal:</span>
                  <strong>{money(cartSubtotal)}</strong>
                </div>
                {calculatedDiscount > 0 && (
                  <div className="cart-bill-row" style={{ color: '#10b981' }}>
                    <span>Discount:</span>
                    <strong>-{money(calculatedDiscount)}</strong>
                  </div>
                )}
                <div className="cart-bill-row cart-bill-total">
                  <span>Total Payable:</span>
                  <strong>{money(cartTotal)}</strong>
                </div>

                {paymentMethod === 'Cash' && cart.length > 0 && (
                  <div className="cash-tendered-panel">
                    <div className="cash-tendered-top">
                      <label className="cash-tendered-label">
                        <Icon name="dollar" size={13} />
                        <span>Cash Received Amount <span className="req-star">*</span></span>
                      </label>
                      {cartTotal > 0 && (
                        <button
                          type="button"
                          className="btn-exact-amount"
                          onClick={() => {
                            setCashTendered(String(cartTotal));
                            if (cashError) setCashError(false);
                          }}
                          title="Auto-fill exact payable amount"
                        >
                          Exact ({money(cartTotal)})
                        </button>
                      )}
                    </div>

                    <div className="cash-input-wrap">
                      <span className="currency-prefix">LKR</span>
                      <input
                        type="number"
                        placeholder="Enter cash received from customer..."
                        value={cashTendered}
                        onChange={(e) => {
                          setCashTendered(e.target.value);
                          if (cashError) setCashError(false);
                        }}
                        className={`cash-input-field ${cashError ? 'input-invalid' : ''}`}
                      />
                    </div>

                    {/* Quick Denomination Chips */}
                    <div className="quick-denominations">
                      {[1000, 2000, 5000, 10000, 20000, 50000]
                        .filter((denom) => denom >= cartTotal || denom >= 1000)
                        .slice(0, 4)
                        .map((denom) => (
                          <button
                            key={denom}
                            type="button"
                            className="btn-denom-chip"
                            onClick={() => {
                              setCashTendered(String(denom));
                              if (cashError) setCashError(false);
                            }}
                          >
                            +{Number(denom).toLocaleString('en-LK')}
                          </button>
                        ))}
                    </div>

                    {/* Live Balance / Change Display */}
                    {cashTendered && Number(cashTendered) > 0 && (
                      <div className={`cash-change-banner ${Number(cashTendered) >= cartTotal ? 'change-positive' : 'change-short'}`}>
                        {Number(cashTendered) >= cartTotal ? (
                          <>
                            <div className="change-info">
                              <span className="change-label">Change / Balance to Return:</span>
                              <strong className="change-figure">{money(changeDue)}</strong>
                            </div>
                            <span className="change-badge">✓ Sufficient</span>
                          </>
                        ) : (
                          <>
                            <div className="change-info">
                              <span className="change-label">Cash Shortfall (Underpaid):</span>
                              <strong className="change-short-figure">-{money(cartTotal - Number(cashTendered))}</strong>
                            </div>
                            <span className="short-badge">⚠ Underpaid</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Checkout Button */}
              <button
                className="btn-checkout"
                disabled={cart.length === 0 || busyAction === 'checkout'}
                onClick={handleCheckout}
              >
                {busyAction === 'checkout' ? (
                  <>
                    <span className="btn-spinner" />
                    <span>Processing Sale...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Sale & Print</span>
                    <Icon name="check" size={16} />
                  </>
                )}
              </button>
            </aside>
          </div>
        )}

        {/* Tab 2: Service Jobs */}
        {activeTab === 'jobs' && (
          <div className="jobs-layout">
            {/* Create Job Card Form */}
            <form className="panel form-card" onSubmit={handleCreateJob}>
              <div className="panel-header" style={{ marginBottom: '8px' }}>
                <div className="panel-title">
                  <p className="panel-eyebrow">NEW REPAIR / MOD</p>
                  <h2>Create Job Card</h2>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Customer Name *</label>
                  <input
                    className="form-control"
                    required
                    placeholder="e.g. Kasun Silva"
                    value={jobCustName}
                    onChange={(e) => setJobCustName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    className="form-control"
                    required
                    placeholder="077 123 4567"
                    value={jobCustPhone}
                    onChange={(e) => setJobCustPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Service Category *</label>
                <select
                  className="form-control"
                  value={jobServiceType}
                  onChange={(e) => setJobServiceType(e.target.value)}
                >
                  <option value="Mobile Repair">Mobile Phone Repair</option>
                  <option value="3W Modification">Three Wheeler / TukTuk Modification</option>
                </select>
              </div>

              <div className="form-group">
                <label>Device Model or Vehicle Number *</label>
                <input
                  className="form-control"
                  required
                  placeholder="e.g. iPhone 13 Pro / Bajaj RE 4S (WP AB-1234)"
                  value={jobDevice}
                  onChange={(e) => setJobDevice(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Reported Issue or Modification Scope *</label>
                <textarea
                  className="form-control"
                  required
                  placeholder="Detailed breakdown of issue, symptoms, or requested modification accessories..."
                  value={jobIssue}
                  onChange={(e) => setJobIssue(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Estimated Cost (LKR)</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Estimated total amount"
                  value={jobCost}
                  onChange={(e) => setJobCost(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn-submit-form"
                disabled={busyAction === 'job'}
              >
                {busyAction === 'job' ? (
                  <>
                    <span className="btn-spinner" />
                    <span>Saving Job Card...</span>
                  </>
                ) : (
                  <>
                    <Icon name="wrench" size={16} />
                    <span>Create Service Job Card</span>
                  </>
                )}
              </button>
            </form>

            {/* Job Queue & Status Pipeline */}
            <section className="panel jobs-queue-section">
              <div className="filter-toolbar">
                <div className="filter-tabs">
                  {['All', 'Received', 'In Progress', 'Ready', 'Delivered'].map((status) => (
                    <button
                      key={status}
                      className={`filter-tab ${jobFilter === status ? 'active' : ''}`}
                      onClick={() => setJobFilter(status)}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                <div className="search-input-group">
                  <span className="search-icon"><Icon name="search" size={15} /></span>
                  <input
                    type="text"
                    placeholder="Search by name, phone, device..."
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Jobs Cards List */}
              {filteredJobs.length === 0 ? (
                <div className="cart-empty-state">
                  <div className="cart-empty-icon">
                    <Icon name="wrench" size={24} />
                  </div>
                  <strong>No jobs found in this view</strong>
                  <p>Create a job card to schedule new repair or custom modification orders.</p>
                </div>
              ) : (
                <div className="job-cards-list">
                  {filteredJobs.map((job) => {
                    const statusClass = `status-${job.status.toLowerCase().replace(/\s+/g, '-')}`;
                    const avatarUrl = getAvatarForName(job.customerName);
                    const steps = ['Received', 'In Progress', 'Ready', 'Delivered'];
                    const currentIdx = steps.indexOf(job.status);

                    return (
                      <article className="job-card" key={job._id}>
                        <div className="job-card-top">
                          <div className="job-customer-info">
                            <img
                              src={avatarUrl}
                              alt={job.customerName}
                              className="customer-avatar-thumb"
                            />
                            <div className="job-customer-meta">
                              <h4>{job.customerName}</h4>
                              <a
                                href={`tel:${job.customerPhone}`}
                                className="job-contact-link"
                                title="Call customer"
                              >
                                <Icon name="phone" size={12} />
                                <span>{job.customerPhone}</span>
                              </a>
                            </div>
                          </div>

                          <span className={`job-status-badge ${statusClass}`}>
                            <Icon name="checkCircle" size={13} />
                            <span>{job.status}</span>
                          </span>
                        </div>

                        <div className="job-device-tag">
                          <Icon name={job.serviceType === 'Mobile Repair' ? 'box' : 'wrench'} size={14} />
                          <span>{job.deviceOrVehicle}</span>
                          <span style={{ color: 'var(--ink-muted)' }}>· {job.serviceType}</span>
                        </div>

                        <p className="job-issue-text">{job.issueDetails}</p>

                        {/* 4-Stage Visual Progress Tracker */}
                        <div className="job-stepper">
                          {steps.map((stepName, sIdx) => {
                            const isCompleted = sIdx < currentIdx;
                            const isCurrent = sIdx === currentIdx;
                            return (
                              <div
                                key={stepName}
                                className={`step-node ${isCompleted ? 'completed' : isCurrent ? 'current' : ''}`}
                              >
                                <div className="step-circle">
                                  {isCompleted ? '✓' : sIdx + 1}
                                </div>
                                <span className="step-label">{stepName}</span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="job-card-footer">
                          <div className="job-cost-badge">
                            Estimated: <strong>{money(job.estimatedCost)}</strong>
                          </div>

                          <div className="job-action-buttons">
                            {job.status === 'Received' && (
                              <button
                                className="btn-status-advance"
                                onClick={() => updateJobStatus(job._id, 'In Progress')}
                              >
                                <span>Start Progress</span>
                                <Icon name="arrowRight" size={14} />
                              </button>
                            )}
                            {job.status === 'In Progress' && (
                              <button
                                className="btn-status-advance"
                                onClick={() => updateJobStatus(job._id, 'Ready')}
                              >
                                <span>Mark Ready for Pickup</span>
                                <Icon name="check" size={14} />
                              </button>
                            )}
                            {job.status === 'Ready' && (
                              <button
                                className="btn-status-advance"
                                style={{ background: '#10b981', color: '#fff' }}
                                onClick={() => updateJobStatus(job._id, 'Delivered')}
                              >
                                <span>Deliver to Customer</span>
                                <Icon name="checkCircle" size={14} />
                              </button>
                            )}
                            {job.status === 'Delivered' && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '11.5px', color: '#10b981', fontWeight: '700' }}>
                                  ✓ Completed
                                </span>
                                <button
                                  className="btn-status-advance"
                                  style={{
                                    padding: '4px 10px',
                                    fontSize: '11px',
                                    background: 'rgba(99, 102, 241, 0.1)',
                                    color: 'var(--brand-primary)',
                                    borderColor: 'rgba(99, 102, 241, 0.25)'
                                  }}
                                  onClick={() => handlePrintJobReceipt(job)}
                                  title="Print Official Service Invoice & Warranty Certificate"
                                >
                                  <Icon name="receipt" size={12} />
                                  <span>Invoice</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Tab 3: Inventory & Stock */}
        {activeTab === 'stock' && (
          <div className="stock-layout">
            {/* Add Stock Item Form */}
            <form className="panel form-card" onSubmit={handleAddProduct}>
              <div className="panel-header" style={{ marginBottom: '8px' }}>
                <div className="panel-title">
                  <p className="panel-eyebrow">CATALOG ENTRY</p>
                  <h2>Add Product to Stock</h2>
                </div>
              </div>

              <div className="form-group">
                <label>Product Name *</label>
                <input
                  className="form-control"
                  required
                  placeholder="e.g. 20W PD Type-C Quick Charger"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Category *</label>
                <select
                  className="form-control"
                  value={prodCat}
                  onChange={(e) => setProdCat(e.target.value)}
                >
                  <option value="Mobile Accessory">Mobile Accessory</option>
                  <option value="Mobile Part">Mobile Part</option>
                  <option value="3W Mod Part">Three Wheeler Modification Part</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Cost Price (LKR)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Wholesale cost"
                    value={prodCost}
                    onChange={(e) => setProdCost(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Selling Price (LKR) *</label>
                  <input
                    type="number"
                    className="form-control"
                    required
                    placeholder="Retail price"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                  />
                </div>
              </div>

              {prodCost && prodPrice && Number(prodPrice) > Number(prodCost) && (
                <div className="profit-badge">
                  +{(((Number(prodPrice) - Number(prodCost)) / Number(prodCost)) * 100).toFixed(0)}% Margin ({money(Number(prodPrice) - Number(prodCost))} profit/unit)
                </div>
              )}

              <div className="form-group">
                <label>Initial Stock Units *</label>
                <input
                  type="number"
                  className="form-control"
                  required
                  placeholder="e.g. 25"
                  value={prodStock}
                  onChange={(e) => setProdStock(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Online Image URL (Optional)</label>
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://images.unsplash.com/..."
                  value={prodImage}
                  onChange={(e) => setProdImage(e.target.value)}
                />
                <small style={{ color: 'var(--ink-muted)', fontSize: '11px', marginTop: '2px' }}>
                  If left empty, a sharp curated category image is applied automatically.
                </small>
              </div>

              <button
                type="submit"
                className="btn-submit-form"
                disabled={busyAction === 'product'}
              >
                {busyAction === 'product' ? (
                  <>
                    <span className="btn-spinner" />
                    <span>Saving Product...</span>
                  </>
                ) : (
                  <>
                    <Icon name="box" size={16} />
                    <span>Add Item to Inventory</span>
                  </>
                )}
              </button>
            </form>

            {/* Inventory Overview Table */}
            <section className="panel inventory-overview-section">
              <div className="filter-toolbar">
                <div className="filter-tabs">
                  {[
                    { id: 'All', label: 'All Items' },
                    { id: '3W Mod Part', label: '3W Mod & Audio' },
                    { id: 'Mobile Accessory', label: 'Mobile Accessories' },
                    { id: 'Mobile Part', label: 'Mobile Spare Parts' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      className={`filter-tab ${stockCategory === cat.id ? 'active' : ''}`}
                      onClick={() => setStockCategory(cat.id)}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn-sync-catalog"
                    onClick={handleResetCatalog}
                    title="Synchronize all 44 Sri Lankan catalog items with database"
                  >
                    <Icon name="refresh" size={13} />
                    <span>Sync 44 Items</span>
                  </button>

                  <div className="search-input-group">
                    <span className="search-icon"><Icon name="search" size={15} /></span>
                    <input
                      type="text"
                      placeholder="Search inventory..."
                      value={stockSearch}
                      onChange={(e) => setStockSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {filteredStockProducts.length === 0 ? (
                <div className="cart-empty-state">
                  <div className="cart-empty-icon">
                    <Icon name="box" size={24} />
                  </div>
                  <strong>No inventory items match your search</strong>
                  <p>Add a new stock item on the left to start tracking parts and accessories.</p>
                </div>
              ) : (
                <div className="inventory-table-container">
                  <table className="inventory-table">
                    <thead>
                      <tr>
                        <th>Product & Category</th>
                        <th>Selling Price</th>
                        <th>Availability</th>
                        <th style={{ textAlign: 'right' }}>Stock Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStockProducts.map((product) => {
                        const isLow = product.stockQuantity > 0 && product.stockQuantity < 5;
                        const isOut = product.stockQuantity === 0;
                        const imgUrl = getProductImage(product);

                        return (
                          <tr key={product._id}>
                            <td>
                              <div className="table-item-cell">
                                <img
                                  src={imgUrl}
                                  alt={product.name}
                                  className="table-item-thumb"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = getProductFallbackImage(product);
                                  }}
                                />
                                <div className="table-item-info">
                                  <strong>{product.name}</strong>
                                  <span className="table-category-tag">{product.category}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <strong style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '13.5px' }}>
                                {money(product.sellingPrice)}
                              </strong>
                            </td>
                            <td>
                              <span className={`stock-tag ${isOut ? 'stock-out' : isLow ? 'stock-low' : 'stock-in'}`}>
                                {isOut ? 'Out of Stock' : isLow ? `Low: ${product.stockQuantity} left` : `${product.stockQuantity} in stock`}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="table-stock-control">
                                <button
                                  className="btn-stock-adjust"
                                  onClick={() => adjustStock(product._id, -1)}
                                  title="Reduce stock by 1"
                                  disabled={product.stockQuantity <= 0}
                                >
                                  -
                                </button>
                                <span style={{ fontWeight: '700', minWidth: '24px', textAlign: 'center' }}>
                                  {product.stockQuantity}
                                </span>
                                <button
                                  className="btn-stock-adjust"
                                  onClick={() => adjustStock(product._id, 1)}
                                  title="Add 1 to stock"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

import numpy as np
import pyromat as pm


def get_default_lines(subst, prop=None, n=5, scaling='linear'):
    if prop == 'p':
        pmin = subst.triple()[1]
        pmax = subst.plim()[1]
        peps = (pmax-pmin)/1000
        if scaling == 'linear':
            vals = np.linspace(pmin + peps, pmax - peps, n)
        elif scaling == 'log':
            vals = np.logspace(np.log10(pmin + peps),
                               np.log10(pmax - peps),
                               n)
        return vals
    else:
        raise pm.utility.PMParamError('Default lines not available for'
                                      '{}.'.format(prop))


def _validate(state_dict):
    if len(state_dict) == 2:
        pass
    else:
        for key in state_dict.copy():
            if state_dict[key] is None or np.isnan(state_dict[key]):
                state_dict.pop(key)
        if len(state_dict) != 2:
            raise pm.utility.PMParamError("Must specify exactly two properties"
                                          " to define a state.")
    return state_dict


def compute_iso_line(subst, n=25, scaling='linear', **kwargs):
    crit = compute_critical(subst)
    pmin, pmax = subst.plim()
    Tmin, Tmax = subst.Tlim()

    if 'p' in kwargs:
        p = np.array(kwargs['p']).flatten()
        Teps = (crit['T']-Tmin)/10

        if scaling == 'linear':
            line_T = np.linspace(Tmin + Teps, Tmax - Teps, n)
        elif scaling == 'log':
            line_T = np.logspace(np.log10(Tmin + Teps),
                                 np.log10(Tmax - Teps),
                                 n)
        else:
            raise ValueError('Invalid scaling.')
        states = compute_state(subst, T=line_T, p=p)

        if p < crit['p']:
            Tsat = subst.Ts(p=p)
            f, g = compute_sat_state(subst, T=Tsat)
            i_insert = np.argmax(states['T'] > Tsat)
            for key in f:
                states[key] = np.insert(states[key],
                                        i_insert,
                                        np.array([f[key], g[key]]).flatten())

    elif "T" in kwargs:

        T = np.array(kwargs['T']).flatten()
        peps = (pmax - pmin) / 1e6

        if scaling == 'linear':
            line_p = np.linspace(pmin + peps, pmax - peps, n)
        elif scaling == 'log':
            line_p = np.logspace(np.log10(pmin + peps),
                                 np.log10(pmax - peps),
                                 n)
        else:
            raise ValueError('Invalid scaling.')

        states = compute_state(subst, p=line_p, T=T)

        if T < crit['T']:
            psat = subst.ps(T=T)

            f, g = compute_sat_state(subst, p=psat)
            i_insert = np.argmax(states['p'] > psat)
            for key in f:
                states[key] = np.insert(states[key],
                                        i_insert,
                                        np.array([g[key], f[key]]).flatten())
    elif 's' in kwargs:
        s = np.array(kwargs['s']).flatten()
        peps = (pmax - pmin) / 1e6

        if scaling == 'linear':
            line_p = np.linspace(pmin + peps, pmax - peps, n)
        elif scaling == 'log':
            line_p = np.logspace(np.log10(pmin + peps),
                                 np.log10(pmax - peps),
                                 n)
        else:
            raise ValueError('Invalid scaling.')

        states = compute_state(subst, p=line_p, s=s)

        #  TODO Identify quality crossovers to insert a state?
        #  Problem being we can't compute the saturated state based on known S
        # i_insert = np.argmax(states['x'] > 0)

    elif 'h' in kwargs:
        h = np.array(kwargs['h']).flatten()
        pmin = subst.triple()[1]
        peps = (pmax - pmin) / 1e6

        if scaling == 'linear':
            line_p = np.linspace(pmin + peps, pmax - peps, n)
        elif scaling == 'log':
            line_p = np.logspace(np.log10(pmin + peps),
                                 np.log10(pmax - peps),
                                 n)
        else:
            raise ValueError('Invalid scaling.')

        states = compute_state(subst, p=line_p, h=h)

    elif 'v' in kwargs:
        v = np.array(kwargs['v']).flatten()
        pmin = subst.triple()[1]
        peps = (pmax - pmin) / 1e6

        if scaling == 'linear':
            line_p = np.linspace(pmin + peps, pmax - peps, n)
        elif scaling == 'log':
            line_p = np.logspace(np.log10(pmin + peps),
                                 np.log10(pmax - peps),
                                 n)
        else:
            raise ValueError('Invalid scaling.')

        states = compute_state(subst, p=line_p, v=v)

    else:
        raise pm.utility.PMParamError('Isoline computation not supported for '
                                      '{}.'.format(kwargs.keys))

    return states


def compute_steamdome(subst, n=25, scaling='linear'):
    critical = compute_critical(subst)
    Tc = critical['T']

    Tmin = subst.triple()[0]
    Teps = (Tc-Tmin)/1000

    if scaling == 'linear':
        line_T = np.linspace(Tmin, Tc-Teps, n).flatten()
    elif scaling == 'log':
        line_T = np.logspace(np.log10(Tmin), np.log10(Tc - Teps), n).flatten()
    else:
        raise ValueError('Invalid scaling.')

    sll, svl = compute_sat_state(subst, T=line_T)
    satliq_states = {}
    satvap_states = {}
    for k in sll:
        satliq_states[k] = np.append(sll[k], critical[k])
        satvap_states[k] = np.append(svl[k], critical[k])

    return satliq_states, satvap_states


def compute_sat_state(subst, **kwargs):
    kwargs = {k.lower(): v for k, v in kwargs.items()}
    if 'p' in kwargs:
        ps = np.array(kwargs['p']).flatten()
        Ts = subst.Ts(p=ps)
    elif 't' in kwargs:
        Ts = np.array(kwargs['t']).flatten()
        ps = subst.ps(T=Ts)
    else:
        raise pm.utility.PMParamError('Saturation state computation not '
                                      'supported for {}.'.format(kwargs.keys))

    sf, sg = subst.ss(T=Ts)
    hf, hg = subst.hs(T=Ts)
    df, dg = subst.ds(T=Ts)
    vf = 1/df
    vg = 1/dg
    ef, eg = subst.es(T=Ts)
    xf = np.zeros_like(sf)
    xg = np.ones_like(sg)
    liq_state = {
            'T': Ts,
            'p': ps,
            'd': df,
            'v': vf,
            'e': ef,
            's': sf,
            'h': hf,
            'x': xf
        }
    vap_state = {
            'T': Ts,
            'p': ps,
            'd': dg,
            'v': vg,
            'e': eg,
            's': sg,
            'h': hg,
            'x': xg
        }
    return liq_state, vap_state


def compute_critical(subst):

    Tc, pc, dc = subst.critical(density=True)
    Tc = np.array([Tc])
    pc = np.array([pc])
    dc = np.array([dc])
    hc, sc, _ = subst.hsd(T=Tc, p=pc)
    ec = subst.e(T=Tc, p=pc)
    vc = 1/dc
    xc = np.array([0])

    critical = {
            'T': Tc,
            'p': pc,
            'd': dc,
            'v': vc,
            'e': ec,
            's': sc,
            'h': hc,
            'x': xc
        }
    return critical


def compute_state(subst, **kwargs):
    kwargs = _validate(kwargs)

    # Make everything lowercase
    kwargs = {k.lower(): v for k, v in kwargs.items()}

    # Which two properties were specified
    if 'p' in kwargs and 't' in kwargs:
        p = np.array(kwargs['p']).flatten()
        T = np.array(kwargs['t']).flatten()
        h, s, d, x = subst.hsd(p=p, T=T, quality=True)
        p = subst.p(T=T, d=d)
        if T.shape != p.shape:
            T = T.repeat(p.shape)
        v = 1/d
        e = subst.e(d=d, p=p)
    elif 'p' in kwargs and 's' in kwargs:
        p = np.array(kwargs['p']).flatten()
        s = np.array(kwargs['s']).flatten()
        T, x = subst.T_s(p=p, s=s, quality=True)

        d = np.zeros_like(x)
        s = np.zeros_like(x)
        h = np.zeros_like(x)
        Isat = x > 0
        # Sat points
        h[Isat], s[Isat], d[Isat] = subst.hsd(T=T[Isat], x=x[Isat])
        # Not Sat points
        Insat = np.logical_not(Isat)
        h[Insat], s[Insat], d[Insat] = subst.hsd(p=p[Insat], T=T[Insat])
        v = 1 / d
        e = subst.e(d=d, T=T)
    elif 'p' in kwargs and 'h' in kwargs:
        p = np.array(kwargs['p']).flatten()
        h = np.array(kwargs['h']).flatten()
        T, x = subst.T_h(p=p, h=h, quality=True)

        d = np.zeros_like(x)
        s = np.zeros_like(x)
        h = np.zeros_like(x)
        Isat = x > 0
        h[Isat], s[Isat], d[Isat] = subst.hsd(T=T[Isat], x=x[Isat])
        Insat = np.logical_not(Isat)
        h[Insat], s[Insat], d[Insat] = subst.hsd(p=p[Insat], T=T[Insat])
        v = 1 / d
        # p = subst.p(T=T, d=d)
        e = subst.e(d=d, p=p)
    elif 'p' in kwargs and 'v' in kwargs:
        p = np.array(kwargs['p']).flatten()
        v = np.array(kwargs['v']).flatten()

        d = 1 / v
        h, _, _ = subst.hsd(p=p, d=d)
        T, x = subst.T_h(p=p, h=h, quality=True)
        d = np.zeros_like(x)
        s = np.zeros_like(x)
        h = np.zeros_like(x)
        Isat = x > 0
        h[Isat], s[Isat], d[Isat] = subst.hsd(T=T[Isat], x=x[Isat])
        Insat = np.logical_not(Isat)
        h[Insat], s[Insat], d[Insat] = subst.hsd(p=p[Insat], T=T[Insat])
        v = 1 / d
        p = subst.p(T=T, d=d)
        e = subst.e(d=d, p=p)
    elif 't' in kwargs and 's' in kwargs:
        T = np.array(kwargs['t']).flatten()
        s = np.array(kwargs['s']).flatten()
        d = subst.d_s(T=T, s=s)
        p = subst.p(T=T, d=d)
        _, x = subst.T_s(p=p, s=s, quality=True)
        if x > 0:  # check if saturated
            h, _, d = subst.hsd(T=T, x=x)
        else:
            h, _, d = subst.hsd(p=p, T=T)
        v = 1 / d
        p = subst.p(T=T, d=d)
        e = subst.e(d=d, p=p)
    elif 't' in kwargs and 'h' in kwargs:
        T = np.array(kwargs['t']).flatten()
        h = np.array(kwargs['h']).flatten()
        raise pm.utility.PMParamError("Specifying T&h not permitted")
    elif 't' in kwargs and 'v' in kwargs:
        T = np.array(kwargs['t']).flatten()
        v = np.array(kwargs['v']).flatten()
        d = 1 / v
        p = subst.p(T=T, d=d)
        T = subst.T(p=p, d=d)
        if T < subst.critical()[0]:
            ds = subst.ds(T=T)
            x = (1 / d - 1 / ds[0]) / (1 / ds[1] - 1 / ds[0])
        else:
            x = -1
        if 0 < x <= 1:
            h, s, d = subst.hsd(T=T, x=x)
        else:
            h, s, d, x = subst.hsd(p=p, T=T, quality=True)
        v = 1 / d
        p = subst.p(T=T, d=d)
        e = subst.e(d=d, p=p)
    elif 't' in kwargs and 'x' in kwargs:
        T = np.array(kwargs['t']).flatten()
        x = np.array(kwargs['x']).flatten()

        p = subst.ps(T=T)
        h, s, d = subst.hsd(T=T, x=x)
        e = subst.e(d=d, p=p)
        v = 1/d
    elif 'p' in kwargs and 'x' in kwargs:
        p = np.array(kwargs['p']).flatten()
        x = np.array(kwargs['x']).flatten()

        T = subst.Ts(p=p)
        h, s, d = subst.hsd(T=T, x=x)
        e = subst.e(d=d, p=p)
        v = 1/d
    else:
        raise pm.utility.PMParamError("Property pair not permitted.")

    state = {
            'T': T,
            'p': p,
            'd': d,
            'v': v,
            'e': e,
            's': s,
            'h': h,
            'x': x
        }
    return state
